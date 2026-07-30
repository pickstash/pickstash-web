-- 022_folder_rls_fix.sql — 폴더 RLS 무한 재귀(42P17) 해소 + 임의 조인 방지.
-- 021의 folders/folder_members/box_folders 정책이 서브쿼리로 folder_members를 참조 →
--   folder_members SELECT 정책이 다시 folder_members를 조회 → 무한 재귀. 폴더 조회/편집이 전부 실패.
-- 해결: 앱의 is_box_participant 패턴처럼 SECURITY DEFINER 헬퍼로 RLS를 우회해 멤버십을 판정한다.
-- 재실행 안전.

-- 멤버십/빈 폴더 판정 헬퍼 (definer → folder_members RLS 우회 → 재귀 없음)
create or replace function public.is_folder_member(p_folder_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from folder_members where folder_id = p_folder_id and user_id = auth.uid());
$$;
create or replace function public.folder_is_empty(p_folder_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select not exists (select 1 from folder_members where folder_id = p_folder_id);
$$;
grant execute on function public.is_folder_member(uuid) to authenticated, anon;
grant execute on function public.folder_is_empty(uuid) to authenticated, anon;

-- folders (insert 정책은 auth.uid() not null 그대로 — 재귀 없음)
drop policy if exists "folders: 멤버 조회" on folders;
create policy "folders: 멤버 조회" on folders for select using (public.is_folder_member(id));
drop policy if exists "folders: 멤버 수정" on folders;
create policy "folders: 멤버 수정" on folders for update using (public.is_folder_member(id));
drop policy if exists "folders: 멤버 삭제" on folders;
create policy "folders: 멤버 삭제" on folders for delete using (public.is_folder_member(id));

-- folder_members (update/delete는 user_id=auth.uid() 그대로 — 재귀 없음)
drop policy if exists "folder_members: 같은 폴더 멤버 조회" on folder_members;
create policy "folder_members: 같은 폴더 멤버 조회" on folder_members for select using (public.is_folder_member(folder_id));
drop policy if exists "folder_members: 본인 추가" on folder_members;
drop policy if exists "folder_members: 빈 폴더 자가 추가" on folder_members;
create policy "folder_members: 빈 폴더 자가 추가" on folder_members for insert
  with check (user_id = auth.uid() and public.folder_is_empty(folder_id));

-- box_folders
drop policy if exists "box_folders: 멤버 조회" on box_folders;
create policy "box_folders: 멤버 조회" on box_folders for select using (public.is_folder_member(folder_id));
drop policy if exists "box_folders: 멤버 insert" on box_folders;
create policy "box_folders: 멤버 insert" on box_folders for insert
  with check (public.is_folder_member(folder_id) and public.is_box_participant(box_id));
drop policy if exists "box_folders: 멤버 update" on box_folders;
create policy "box_folders: 멤버 update" on box_folders for update using (public.is_folder_member(folder_id));
drop policy if exists "box_folders: 멤버 delete" on box_folders;
create policy "box_folders: 멤버 delete" on box_folders for delete using (public.is_folder_member(folder_id));
