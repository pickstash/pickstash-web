-- 030: 초대(invite) 알림을 '새 참여자(join)'와 분리 — 별도 on/off 컬럼.
-- 직접 초대(함께한 친구 목록에서 바로 추가)받은 본인에게 가는 푸시를 따로 끄고 켤 수 있게.
-- 기본 on(행 없으면 켜진 것으로 간주). 재실행 안전.
alter table public.notification_prefs
  add column if not exists invite_enabled boolean not null default true;  -- 나를 초대함
