-- 054_lock_backup_tables.sql — 마이그레이션 백업 테이블(_bkp_msy_*)의 RLS 노출 차단.
--   보안 어드바이저 ERROR: public 스키마에 RLS 없이 노출됨(실데이터 소량 포함) → API로 읽힐 수 있음.
--   RLS만 켜고 정책은 만들지 않는다 → anon/authenticated 접근 불가, service_role만(백업 데이터는 보존).
--   완전 삭제(drop)는 비가역이라 보류 — 필요 시 별도로 확인 후 drop.
-- 재실행 안전(alter table if exists ... enable row level security = 이미 켜져도 무해).
alter table if exists public._bkp_msy_box_activities enable row level security;
alter table if exists public._bkp_msy_box_participants enable row level security;
alter table if exists public._bkp_msy_comments enable row level security;
alter table if exists public._bkp_msy_folder_members enable row level security;
alter table if exists public._bkp_msy_options enable row level security;
alter table if exists public._bkp_msy_votes enable row level security;
