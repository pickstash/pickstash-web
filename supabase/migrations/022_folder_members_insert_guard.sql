-- 022_folder_members_insert_guard.sql — 임의 폴더 조인 방지(보안).
-- 021의 folder_members insert 정책은 "아무 폴더에나 자기 자신 추가" 허용 → 폴더 id만 알면 무단 조인 가능.
-- 정상 조인은 join_folder_by_invite_code(security definer)로만. 클라이언트 직접 insert는
--   '아직 멤버가 없는 빈 폴더'(=방금 내가 만든 폴더)에 나를 넣는 경우만 허용한다.
-- 재실행 안전.

drop policy if exists "folder_members: 본인 추가" on folder_members;
drop policy if exists "folder_members: 빈 폴더 자가 추가" on folder_members;
create policy "folder_members: 빈 폴더 자가 추가" on folder_members for insert with check (
  user_id = auth.uid()
  and not exists (select 1 from folder_members m where m.folder_id = folder_members.folder_id)
);
