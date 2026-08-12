-- 045: 공유 서랍 안 특정 상자를 '나만 보기'로. spec §3-7 v3.
--   현행: box_folders에 담기면 트리거가 폴더 멤버 전원을 그 상자 참여자로 박음(= 무조건 공유).
--   변경: box_folders 링크마다 shared 플래그. 기본 true(현행). 담을 때 '나만 보기'를 누르면 false로 담겨
--         → 자동참여 트리거가 스킵 → 나만 참여자. 다른 멤버 폴더뷰·초대뷰어에서 안 보임.
--   여러 서랍 지원: 플래그는 (folder,box) 링크별이라, 같은 상자를 A서랍엔 공유·B서랍엔 나만으로 담을 수 있음.
--
-- ⚠️ 무중단: 라이브 main은 box_folders INSERT 시 shared를 안 넘긴다 → 컬럼 default(true) → 트리거 현행 동작 그대로.
-- 재실행 안전(add column if not exists / create or replace). 기존 링크는 default true로 백필(현행 공유 보존).

alter table public.box_folders add column if not exists shared boolean not null default true;

-- ── 트리거 2종: shared=false 링크는 자동참여에서 스킵 ────────────────────────────
-- 6a) box_folders INSERT → (공유일 때만) 폴더 멤버 전원 그 상자 참여자 등록
create or replace function public.folder_box_added_join()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.shared then
    insert into box_participants (box_id, user_id)
    select new.box_id, fm.user_id from folder_members fm where fm.folder_id = new.folder_id
    on conflict do nothing;
  end if;
  return new;
end; $$;

-- 6b) folder_members INSERT → 그 폴더의 '공유' 상자에만 이 유저 참여자 등록(나만 상자는 제외)
create or replace function public.folder_member_added_join()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into box_participants (box_id, user_id)
  select bf.box_id, new.user_id from box_folders bf where bf.folder_id = new.folder_id and bf.shared
  on conflict do nothing;
  return new;
end; $$;

-- ── 링크별 공유/나만 토글 RPC (참여자 추가/제거까지 동기화) ──────────────────────
create or replace function public.set_box_folder_shared(p_folder_id uuid, p_box_id uuid, p_shared boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  -- 이 폴더 멤버 & 이 상자 참여자만 토글 가능
  if not exists (select 1 from folder_members where folder_id = p_folder_id and user_id = v_uid) then
    raise exception 'not a folder member';
  end if;
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = v_uid) then
    raise exception 'not a box participant';
  end if;

  update box_folders set shared = p_shared where folder_id = p_folder_id and box_id = p_box_id;

  if p_shared then
    -- 나만→공유: 폴더 멤버 전원 참여자로
    insert into box_participants (box_id, user_id)
    select p_box_id, fm.user_id from folder_members fm where fm.folder_id = p_folder_id
    on conflict do nothing;
  else
    -- 공유→나만: 나를 제외한 이 폴더 멤버를 참여자에서 제거.
    --   단 내가 아직 멤버인 '다른 공유 폴더' 링크로 정당화되는 멤버는 유지(멀티폴더 안전, leave_folder와 동일 패턴).
    delete from box_participants bp
    where bp.box_id = p_box_id
      and bp.user_id <> v_uid
      and exists (select 1 from folder_members fm where fm.folder_id = p_folder_id and fm.user_id = bp.user_id)
      and not exists (
        select 1 from box_folders bf2
        join folder_members fm2 on fm2.folder_id = bf2.folder_id and fm2.user_id = bp.user_id
        where bf2.box_id = p_box_id and bf2.folder_id <> p_folder_id and bf2.shared
      );
  end if;
end; $$;
grant execute on function set_box_folder_shared(uuid, uuid, boolean) to authenticated;

-- ── 초대 뷰어: '나만' 상자는 목록에서 제외 ───────────────────────────────────────
create or replace function get_folder_view_by_invite_code(p_code text)
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'id',           f.id,
    'name',         f.name,
    'member_count', (select count(*) from folder_members m where m.folder_id = f.id),
    'boxes', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',                b.id,
                 'title',             b.title,
                 'decision_mode',     b.decision_mode,
                 'deadline_at',       b.deadline_at,
                 'closed_at',         b.closed_at,
                 'invite_code',       b.invite_code,
                 'participant_count', (select count(*) from box_participants bp where bp.box_id = b.id),
                 'participants', coalesce((
                   select jsonb_agg(jsonb_build_object('id', pr.id, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url) order by bp.joined_at)
                   from box_participants bp join profiles pr on pr.id = bp.user_id where bp.box_id = b.id
                 ), '[]'::jsonb),
                 'total_likes', (select count(*) from votes v join options o on o.id = v.option_id where o.box_id = b.id and v.vote_type = 'like')
               ) order by bf.sort, bf.created_at
             )
      from box_folders bf join boxes b on b.id = bf.box_id where bf.folder_id = f.id and bf.shared
    ), '[]'::jsonb)
  )
  from folders f where f.invite_code = p_code;
$$;
grant execute on function get_folder_view_by_invite_code(text) to anon, authenticated;
