-- 050: 상자 목록 개인별 수동 정렬 — box_participants.sort
-- '상자' 탭 전체 목록을 활동순 대신 사용자가 드래그로 정한 순서로 보여주기 위한 컬럼.
-- 개인별(참여자 행별) 정렬이라 folder_members.sort / box_folders.sort와 동일한 패턴.
-- 추가전용·idempotent. default 0 → 기존 행/신규 상자는 sort 0(동점)으로 남아 updated_at 최신순 tiebreak.
alter table public.box_participants
  add column if not exists sort int not null default 0;
