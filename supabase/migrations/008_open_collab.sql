-- 008_open_collab.sql — 협업 권한 전면 개방 + 나가기 기반 라이프사이클
-- 방장/작성자 구분 없이 "참여자면 누구나" 상자·선택지 편집.
-- 상자 삭제 대신 나가기가 기본, 마지막 1명이 나가면 상자 자동 삭제.
-- 여러 번 실행해도 안전(idempotent).

-- ─────────────────────────────────────────────
-- ① 상자 수정: 방장만 → 참여자 누구나
-- ─────────────────────────────────────────────
drop policy if exists "boxes: owner 수정" on boxes;
drop policy if exists "boxes: 참여자 수정" on boxes;
create policy "boxes: 참여자 수정" on boxes for update
  using (exists (select 1 from box_participants where box_id = boxes.id and user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- ② 선택지 수정/삭제: 작성자·방장 → 참여자 누구나
--    (추가(insert)는 이미 참여자면 가능 — created_by=self 조건만 유지)
-- ─────────────────────────────────────────────
drop policy if exists "options: 작성자·owner 수정" on options;
drop policy if exists "options: 참여자 수정" on options;
create policy "options: 참여자 수정" on options for update
  using (exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid()));

drop policy if exists "options: 작성자·owner 삭제" on options;
drop policy if exists "options: 참여자 삭제" on options;
create policy "options: 참여자 삭제" on options for delete
  using (exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- ③ 마지막 참여자가 나가면 상자 자동 삭제
--    box_participants 삭제(=나가기) 후, 남은 참여자가 없으면 상자 delete → cascade로 정리.
--    security definer: 삭제자 권한과 무관하게 실행. 상자 cascade 중 재진입 방지 가드 포함.
-- ─────────────────────────────────────────────
create or replace function delete_box_when_empty() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from boxes where id = OLD.box_id)
     and not exists (select 1 from box_participants where box_id = OLD.box_id) then
    delete from boxes where id = OLD.box_id;
  end if;
  return null;
end; $$;

drop trigger if exists trg_delete_box_when_empty on box_participants;
create trigger trg_delete_box_when_empty
  after delete on box_participants
  for each row execute function delete_box_when_empty();
