-- 048_folder_box_access_rework.sql — 서랍 "담기 ≠ 초대" 전면 재설계.
-- 배경(사용자 확정): 서랍에 상자를 담아도 더 이상 서랍 멤버가 자동으로 그 상자의 참여자가 되지 않는다.
--   대신 서랍 멤버는 그 서랍에 담긴(자신이 담았거나, 담은 사람이 '공유'로 설정한) 상자를 읽기 전용으로
--   조회만 할 수 있고, 편집·투표하려면 "함께하기"(join_box)를 눌러 승인 없이 바로 참여자가 된다.
--   공유/나만 보기는 초대 여부와 무관하게 "누가 담았는지"별로 개별 관리한다 — 같은 상자를 같은 서랍에
--   여러 멤버가 각자 담고 각자 공개 여부를 정할 수 있어야 한다(box_folders를 다시 담은 사람별로 스코프).
-- 045(box_folder_private)·021(shared_folder_rework)의 "담기=자동초대" 전제를 폐기.
-- 재실행 안전(add column/drop trigger/drop function/create or replace 전부 if exists 가드).
-- ⚠️ 라이브 DB — 대시보드 SQL Editor에서 코드 배포 전에 먼저 적용할 것.

-- ─────────────────────────────────────────────────────────────
-- 1) box_folders: 폴더 스코프(folder_id,box_id) → 담은 사람별 스코프(folder_id,box_id,added_by)
-- ─────────────────────────────────────────────────────────────
alter table box_folders add column if not exists added_by uuid references profiles(id) on delete cascade;

-- 백필: 기존 행(폴더당 1행, 021 모델)은 그 폴더의 최초 멤버가 담은 것으로 간주.
update box_folders bf set added_by = (
  select fm.user_id from folder_members fm where fm.folder_id = bf.folder_id order by fm.joined_at asc limit 1
) where added_by is null;

alter table box_folders alter column added_by set not null;

alter table box_folders drop constraint if exists box_folders_pkey;
alter table box_folders add constraint box_folders_pkey primary key (folder_id, box_id, added_by);

-- ─────────────────────────────────────────────────────────────
-- 2) 자동참여 트리거 완전 폐기 (021의 6a/6b) — 담기는 더 이상 초대가 아니다.
--    folder_delete_when_empty(021 6c, 빈 서랍 자동 소멸)는 서랍 라이프사이클이라 유지.
-- ─────────────────────────────────────────────────────────────
drop trigger if exists trg_folder_box_added on box_folders;
drop function if exists public.folder_box_added_join();
drop trigger if exists trg_folder_member_added on folder_members;
drop function if exists public.folder_member_added_join();

-- ─────────────────────────────────────────────────────────────
-- 3) 읽기 접근 헬퍼. is_box_participant는 022가 참조만 하고 실제 정의가 없던 함수 — 여기서 처음 정의.
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_box_participant(p_box_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid());
$$;
grant execute on function public.is_box_participant(uuid) to authenticated;

-- 참여자이거나, 내가 멤버인 서랍에 (내가 담았거나 shared=true로) 담긴 상자면 읽기 가능.
create or replace function public.can_read_box(p_box_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_box_participant(p_box_id)
    or exists (
      select 1 from box_folders bf
      join folder_members fm on fm.folder_id = bf.folder_id and fm.user_id = auth.uid()
      where bf.box_id = p_box_id and (bf.added_by = auth.uid() or bf.shared)
    );
$$;
grant execute on function public.can_read_box(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 4) SELECT RLS 확장 — 쓰기 정책은 전부 그대로(편집은 여전히 참여자만).
-- ─────────────────────────────────────────────────────────────
drop policy if exists "boxes: 참여자 조회" on boxes;
create policy "boxes: 참여자 조회" on boxes for select using (public.can_read_box(boxes.id));

drop policy if exists "box_participants: 참여자 조회" on box_participants;
create policy "box_participants: 참여자 조회" on box_participants for select
  using (public.can_read_box(box_participants.box_id));

drop policy if exists "options: 참여자 조회" on options;
create policy "options: 참여자 조회" on options for select using (public.can_read_box(options.box_id));

drop policy if exists "votes: 참여자 조회" on votes;
create policy "votes: 참여자 조회" on votes for select
  using (exists (select 1 from options o where o.id = votes.option_id and public.can_read_box(o.box_id)));

drop policy if exists "comments: 참여자 조회" on comments;
create policy "comments: 참여자 조회" on comments for select
  using (exists (select 1 from options o where o.id = comments.option_id and public.can_read_box(o.box_id)));

drop policy if exists "comment_likes: 참여자 조회" on comment_likes;
create policy "comment_likes: 참여자 조회" on comment_likes for select
  using (exists (
    select 1 from comments c join options o on o.id = c.option_id
    where c.id = comment_likes.comment_id and public.can_read_box(o.box_id)
  ));

-- ─────────────────────────────────────────────────────────────
-- 5) box_folders RLS 전면 재작성 (added_by 스코프)
--    담기(insert)는 여전히 '그 상자의 참여자만' 가능. 조회는 내 링크 + 남의 공유 링크.
--    수정/삭제는 내가 담은 링크만 — 남이 공유한 링크는 보이기만 하고 내가 건드릴 수 없다.
-- ─────────────────────────────────────────────────────────────
drop policy if exists "box_folders: 멤버 조회" on box_folders;
drop policy if exists "box_folders: 조회" on box_folders;
create policy "box_folders: 조회" on box_folders for select
  using (public.is_folder_member(folder_id) and (added_by = auth.uid() or shared));

drop policy if exists "box_folders: 멤버 insert" on box_folders;
drop policy if exists "box_folders: 본인 insert" on box_folders;
create policy "box_folders: 본인 insert" on box_folders for insert
  with check (added_by = auth.uid() and public.is_folder_member(folder_id) and public.is_box_participant(box_id));

drop policy if exists "box_folders: 멤버 update" on box_folders;
drop policy if exists "box_folders: 본인 update" on box_folders;
create policy "box_folders: 본인 update" on box_folders for update using (added_by = auth.uid());

drop policy if exists "box_folders: 멤버 delete" on box_folders;
drop policy if exists "box_folders: 본인 delete" on box_folders;
create policy "box_folders: 본인 delete" on box_folders for delete using (added_by = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 6) set_box_folder_shared(045) 폐기 — 이제 참여자 동기화가 필요 없으니(가시성≠참여) 앱에서 직접
--    UPDATE box_folders (RLS가 added_by=auth.uid()로 이미 제한).
-- ─────────────────────────────────────────────────────────────
drop function if exists public.set_box_folder_shared(uuid, uuid, boolean);

-- ─────────────────────────────────────────────────────────────
-- 7) join_box — "함께하기". 승인 없이 즉시 참여(잠정 — 오남용 문제 생기면 승인제로 전환 검토).
--    can_read_box가 참여 여부를 우선 체크하므로, 여기 게이트는 사실상 '서랍 접근 경로로 볼 수 있는가'만
--    검증한다. 공개 탐색(visibility='public')은 포함하지 않아 041의 request_to_join(승인제)과 분리된다.
-- ─────────────────────────────────────────────────────────────
create or replace function public.join_box(p_box_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '로그인이 필요해요'; end if;
  if exists (select 1 from box_participants where box_id = p_box_id and user_id = v_uid) then return; end if;
  if not public.can_read_box(p_box_id) then raise exception '접근할 수 없는 상자예요'; end if;
  insert into box_participants (box_id, user_id) values (p_box_id, v_uid);
  insert into box_activities (box_id, actor_id, type) values (p_box_id, v_uid, 'participant_joined');
end;
$$;
grant execute on function public.join_box(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 8) 032 clean_solo_folder_box_on_leave — added_by 스코프 명시(로직상 결과는 동일, 의도를 분명히).
-- ─────────────────────────────────────────────────────────────
create or replace function public.clean_solo_folder_box_on_leave()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  delete from box_folders bf
  where bf.box_id = old.box_id
    and bf.added_by = old.user_id
    and bf.folder_id in (
      select fm.folder_id
      from folder_members fm
      where fm.user_id = old.user_id
        and (select count(*) from folder_members f2 where f2.folder_id = fm.folder_id) = 1
    );
  return old;
end;
$$;
-- 트리거 자체는 이미 032에서 생성됨(재사용) — 함수만 재정의하면 됨. 안전하게 재생성.
drop trigger if exists trg_clean_solo_folder_box_on_leave on box_participants;
create trigger trg_clean_solo_folder_box_on_leave
  after delete on box_participants
  for each row execute function public.clean_solo_folder_box_on_leave();

-- ─────────────────────────────────────────────────────────────
-- 9) get_folder_view_by_invite_code(폴더 초대 랜딩, 비회원용) — shared=true 링크만, box_id로 dedupe.
-- ─────────────────────────────────────────────────────────────
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
               ) order by bx.sort, bx.created_at
             )
      from (
        select distinct on (bf.box_id) bf.box_id, bf.sort, bf.created_at
        from box_folders bf where bf.folder_id = f.id and bf.shared
        order by bf.box_id, bf.created_at asc
      ) bx
      join boxes b on b.id = bx.box_id
    ), '[]'::jsonb)
  )
  from folders f where f.invite_code = p_code;
$$;
grant execute on function get_folder_view_by_invite_code(text) to anon, authenticated;
