-- 021_shared_folder_rework.sql — 폴더를 '단일 공유 객체 + 멤버(무오너)'로 재설계. spec §3-7 v2.
-- 018/019(복사본 모델) 폐기 → 하나의 공유 폴더를 멤버 여럿이 공유. box_folders는 폴더 스코프(공유 목록).
-- 라이프사이클은 상자 규칙 미러: 누구나 편집, 나가기, 마지막 멤버 나가면 폴더 자동 소멸.
-- ⚠️ 파괴적(box_folders 재구성 + folders 컬럼 제거). 적용 전 백업 권장. 가드로 재실행 안전 지향.

-- 0) 019 복사본 동기화 트리거/함수 폐기
drop trigger if exists trg_sync_folder_box on box_folders;
drop function if exists public.sync_folder_box_to_subscribers();

-- 0.5) 옛 RLS 정책 먼저 제거 — user_id 컬럼을 참조하므로 컬럼 드롭(4·5) 전에 반드시 없애야 함.
drop policy if exists "folders: 본인 조회" on folders;
drop policy if exists "folders: 본인 insert" on folders;
drop policy if exists "folders: 본인 update" on folders;
drop policy if exists "folders: 본인 delete" on folders;
drop policy if exists "box_folders: 본인 조회" on box_folders;
drop policy if exists "box_folders: 본인 insert" on box_folders;
drop policy if exists "box_folders: 본인 update" on box_folders;
drop policy if exists "box_folders: 본인 delete" on box_folders;

-- 1) folder_members — 폴더 멤버(참여자). 개인 폴더=멤버1, 공유=멤버2+.
create table if not exists folder_members (
  folder_id uuid not null references folders(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  sort int not null default 0,          -- 각자 드로어 표시 순서(개인별)
  joined_at timestamptz not null default now(),
  primary key (folder_id, user_id)
);
create index if not exists folder_members_user_idx on folder_members(user_id);

-- 2) 기존 folders → folder_members 채우기 (각 폴더의 소유자 = 멤버). folders.user_id가 남아있을 때만.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='folders' and column_name='user_id') then
    insert into folder_members (folder_id, user_id, sort)
      select f.id, f.user_id, f.sort from folders f
      on conflict do nothing;
  end if;
end $$;

-- 3) 018 복사본 병합: 복사본(source_folder_id)의 소유자를 원본 폴더 멤버로 편입 후 복사본 삭제.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='folders' and column_name='source_folder_id') then
    insert into folder_members (folder_id, user_id)
      select f.source_folder_id, f.user_id from folders f
      where f.source_folder_id is not null
        and exists (select 1 from folders s where s.id = f.source_folder_id)
      on conflict do nothing;
    delete from folders where source_folder_id is not null;  -- 복사본 삭제(그 box_folders는 cascade)
  end if;
end $$;

-- 4) box_folders를 폴더 스코프로: user_id 제거, PK (folder_id, box_id).
--    (현재 데이터는 폴더당 단일 오너라 (folder_id, box_id)가 유일 → 무손실. 방어적으로 중복 정리.)
alter table box_folders drop constraint if exists box_folders_pkey;
delete from box_folders a using box_folders b
  where a.folder_id = b.folder_id and a.box_id = b.box_id and a.ctid > b.ctid;
alter table box_folders drop column if exists user_id;
alter table box_folders add constraint box_folders_pkey primary key (folder_id, box_id);
-- user_id 컬럼과 함께 자동 삭제된 (user_id,folder_id,sort) 인덱스를 폴더 스코프로 재생성
create index if not exists box_folders_folder_sort_idx on box_folders(folder_id, sort);

-- 5) folders에서 오너/복사 컬럼 제거
alter table folders drop column if exists source_folder_id;
alter table folders drop column if exists user_id;

-- 6) 트리거 3종 ----------------------------------------------------------------
-- 6a) box_folders INSERT → 폴더 멤버 전원 그 상자 참여자 등록(초대)
create or replace function public.folder_box_added_join()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into box_participants (box_id, user_id)
  select new.box_id, fm.user_id from folder_members fm where fm.folder_id = new.folder_id
  on conflict do nothing;
  return new;
end; $$;
drop trigger if exists trg_folder_box_added on box_folders;
create trigger trg_folder_box_added after insert on box_folders
  for each row execute function public.folder_box_added_join();

-- 6b) folder_members INSERT → 그 폴더의 모든 상자에 이 유저 참여자 등록
create or replace function public.folder_member_added_join()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into box_participants (box_id, user_id)
  select bf.box_id, new.user_id from box_folders bf where bf.folder_id = new.folder_id
  on conflict do nothing;
  return new;
end; $$;
drop trigger if exists trg_folder_member_added on folder_members;
create trigger trg_folder_member_added after insert on folder_members
  for each row execute function public.folder_member_added_join();

-- 6c) folder_members DELETE → 멤버 0이면 폴더 자동 소멸(상자의 '마지막 나감→삭제'와 동일)
create or replace function public.folder_delete_when_empty()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from folder_members where folder_id = old.folder_id) then
    delete from folders where id = old.folder_id;
  end if;
  return old;
end; $$;
drop trigger if exists trg_folder_delete_when_empty on folder_members;
create trigger trg_folder_delete_when_empty after delete on folder_members
  for each row execute function public.folder_delete_when_empty();

-- 7) RLS 재작성 (멤버 기준) --------------------------------------------------
-- folders
drop policy if exists "folders: 본인 조회" on folders;
drop policy if exists "folders: 본인 insert" on folders;
drop policy if exists "folders: 본인 update" on folders;
drop policy if exists "folders: 본인 delete" on folders;
drop policy if exists "folders: 멤버 조회" on folders;
create policy "folders: 멤버 조회" on folders for select
  using (exists (select 1 from folder_members m where m.folder_id = folders.id and m.user_id = auth.uid()));
drop policy if exists "folders: 로그인 생성" on folders;
create policy "folders: 로그인 생성" on folders for insert with check (auth.uid() is not null);
drop policy if exists "folders: 멤버 수정" on folders;
create policy "folders: 멤버 수정" on folders for update
  using (exists (select 1 from folder_members m where m.folder_id = folders.id and m.user_id = auth.uid()));
drop policy if exists "folders: 멤버 삭제" on folders;
create policy "folders: 멤버 삭제" on folders for delete
  using (exists (select 1 from folder_members m where m.folder_id = folders.id and m.user_id = auth.uid()));

-- folder_members
alter table folder_members enable row level security;
drop policy if exists "folder_members: 같은 폴더 멤버 조회" on folder_members;
create policy "folder_members: 같은 폴더 멤버 조회" on folder_members for select
  using (exists (select 1 from folder_members m2 where m2.folder_id = folder_members.folder_id and m2.user_id = auth.uid()));
drop policy if exists "folder_members: 본인 추가" on folder_members;
create policy "folder_members: 본인 추가" on folder_members for insert with check (user_id = auth.uid());
drop policy if exists "folder_members: 본인 정렬" on folder_members;
create policy "folder_members: 본인 정렬" on folder_members for update using (user_id = auth.uid());
drop policy if exists "folder_members: 본인 나가기" on folder_members;
create policy "folder_members: 본인 나가기" on folder_members for delete using (user_id = auth.uid());

-- box_folders (폴더 멤버면 조회/편집. 추가는 '내가 참여 중인 상자'만 필링 가능)
drop policy if exists "box_folders: 본인 조회" on box_folders;
drop policy if exists "box_folders: 본인 insert" on box_folders;
drop policy if exists "box_folders: 본인 update" on box_folders;
drop policy if exists "box_folders: 본인 delete" on box_folders;
drop policy if exists "box_folders: 멤버 조회" on box_folders;
create policy "box_folders: 멤버 조회" on box_folders for select
  using (exists (select 1 from folder_members m where m.folder_id = box_folders.folder_id and m.user_id = auth.uid()));
drop policy if exists "box_folders: 멤버 insert" on box_folders;
create policy "box_folders: 멤버 insert" on box_folders for insert with check (
  exists (select 1 from folder_members m where m.folder_id = box_folders.folder_id and m.user_id = auth.uid())
  and exists (select 1 from box_participants bp where bp.box_id = box_folders.box_id and bp.user_id = auth.uid())
);
drop policy if exists "box_folders: 멤버 update" on box_folders;
create policy "box_folders: 멤버 update" on box_folders for update
  using (exists (select 1 from folder_members m where m.folder_id = box_folders.folder_id and m.user_id = auth.uid()));
drop policy if exists "box_folders: 멤버 delete" on box_folders;
create policy "box_folders: 멤버 delete" on box_folders for delete
  using (exists (select 1 from folder_members m where m.folder_id = box_folders.folder_id and m.user_id = auth.uid()));

-- 8) RPC 재작성 --------------------------------------------------------------
-- 뷰어: 폴더 + 공유 상자 목록(폴더 스코프). 오너 개념 없음 → member_count 노출.
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
      from box_folders bf join boxes b on b.id = bf.box_id where bf.folder_id = f.id
    ), '[]'::jsonb)
  )
  from folders f where f.invite_code = p_code;
$$;
grant execute on function get_folder_view_by_invite_code(text) to anon, authenticated;

-- 참여: 멤버 등록(멱등). 트리거가 그 폴더 상자 전원 참여 처리. 반환 folder_id.
create or replace function join_folder_by_invite_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_fid uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select id into v_fid from folders where invite_code = p_code;
  if v_fid is null then raise exception 'invalid folder code'; end if;
  insert into folder_members (folder_id, user_id) values (v_fid, v_uid) on conflict do nothing;
  return v_fid;
end; $$;
grant execute on function join_folder_by_invite_code(text) to authenticated;

-- 나가기: 멤버십 제거(트리거가 마지막이면 폴더 소멸). p_leave_boxes면 그 폴더 상자에서도 나감
--   — 단 내가 아직 멤버인 다른 폴더에 든 상자는 제외(멀티폴더 안전).
create or replace function leave_folder(p_folder_id uuid, p_leave_boxes boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_leave_boxes then
    delete from box_participants bp
    where bp.user_id = v_uid
      and bp.box_id in (select box_id from box_folders where folder_id = p_folder_id)
      and not exists (
        select 1 from box_folders bf2
        join folder_members fm2 on fm2.folder_id = bf2.folder_id and fm2.user_id = v_uid
        where bf2.box_id = bp.box_id and bf2.folder_id <> p_folder_id
      );
  end if;
  delete from folder_members where folder_id = p_folder_id and user_id = v_uid;
end; $$;
grant execute on function leave_folder(uuid, boolean) to authenticated;
