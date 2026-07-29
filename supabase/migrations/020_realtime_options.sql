-- 020_realtime_options.sql — 선택지 실시간(추가/삭제·댓글 수) 활성화.
-- options를 supabase_realtime publication에 추가 + REPLICA IDENTITY FULL
--   (DELETE 이벤트가 RLS 평가용 old row 컬럼을 싣도록 — 없으면 '삭제'가 구독자에게 전달 안 됨).
-- votes/comments는 이미 publication + full(기존 설정). 재실행 안전(idempotent).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'options'
  ) then
    alter publication supabase_realtime add table options;
  end if;
end $$;

alter table options replica identity full;
