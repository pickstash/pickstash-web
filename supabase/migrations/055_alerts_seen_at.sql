-- 055_alerts_seen_at.sql — 타겟 알림(참여 거절 등) 읽음 처리용 개인 timestamp.
--   기존 읽음 처리는 box_participants.last_seen_at(상자 단위)라, 거절 대상자처럼 그 상자의
--   참여자가 아닌 사람에게는 읽음을 저장할 곳이 없어 알림이 영원히 '안읽음'으로 재등장했다.
--   profiles에 개인 alerts_seen_at을 두고, 참여 상자가 아닌 타겟 알림은 이 값으로 unseen을 판정한다.
-- 재실행 안전. 코드 배포 전 대시보드에서 먼저 실행(안 하면 타겟 알림 읽음 처리만 계속 안 됨).
alter table profiles add column if not exists alerts_seen_at timestamptz;
