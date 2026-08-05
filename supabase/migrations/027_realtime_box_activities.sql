-- 027: box_activities 실시간(Realtime) 활성화 — 알림함 라이브 수신.
-- 알림함(/alerts)이 열려 있는 동안 새 활동(댓글·투표·선택지 추가)이 들어오면
-- useRealtimeAlerts가 INSERT 이벤트를 받아 ['alerts'] 캐시를 무효화 → 바로 목록에 뜬다.
-- INSERT만 필요하므로 replica identity 변경 불필요. 재실행 안전(이미 등록 시 no-op).

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'box_activities'
  ) then
    alter publication supabase_realtime add table box_activities;
  end if;
end $$;
