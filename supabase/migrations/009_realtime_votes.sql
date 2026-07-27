-- 009_realtime_votes.sql — votes(좋아요)·comments 실시간 반영 보장
-- 증상: 내가 좋아요를 눌러도 다른 참여자 화면에 바로 반영 안 됨.
-- 원인: supabase_realtime publication에 public 테이블이 하나도 등록돼 있지 않아
--       postgres_changes 이벤트가 다른 클라이언트로 전달되지 않음. (앱 코드·RLS는 정상)
-- 여러 번 실행해도 안전(idempotent).

-- ① publication 자체가 없으면 생성 (Supabase 기본 제공이지만 방어적으로)
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

-- ② Realtime publication에 votes + comments 추가 — 이미 있으면 건너뜀
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'votes'
  ) then
    alter publication supabase_realtime add table votes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table comments;
  end if;
end $$;

-- ③ REPLICA IDENTITY FULL — DELETE(좋아요 취소) 이벤트가 option_id 등 컬럼을 실어보내
--    구독자의 RLS(참여자 조회 = options→box_participants 조인) 평가를 통과하게 한다.
--    (기본값=PK만 전송이라 DELETE가 다른 화면에 반영 안 되는 문제 방지)
alter table votes replica identity full;
alter table comments replica identity full;
