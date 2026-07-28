-- 015_box_folders_sort.sql — 폴더 안 상자 정렬 순서(개인별)
-- 폴더 화면 '편집 모드'에서 상자 순서를 바꾸기 위해 box_folders에 정렬 컬럼 추가.
-- 사용자별 분류 행(box_folders)에 sort를 두므로, 같은 상자라도 사람마다 자기 폴더 순서가 독립적이다.
-- 여러 번 실행해도 안전(idempotent).
-- ⚠️ 라이브 DB: 이 컬럼을 읽고 쓰는 코드(폴더 화면)를 push하기 전에 대시보드에서 먼저 적용할 것.

alter table box_folders add column if not exists sort int not null default 0;

create index if not exists box_folders_folder_sort_idx on box_folders (user_id, folder_id, sort);
