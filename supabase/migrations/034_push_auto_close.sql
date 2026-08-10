-- 034_push_auto_close.sql — 자동마감 시 토스 푸시까지 발송(다른 알림들과 동일 파이프라인)
-- 배경: 발송은 Vercel 라우트(mTLS) /api/toss/send가 하고, 자동마감(상자 닫기)은 DB의 pg_cron(SQL)이 한다.
--   그래서 아무도 상자를 안 열고 크론이 닫으면 TS sendPush를 안 타 푸시가 안 나갔다(인앱 알림만).
-- 해결: box_activities에 box_closed_auto(=자동마감 시스템 이벤트)가 insert되면 트리거가 pg_net으로
--   send-push 엣지를 호출 → 엣지가 기존 secret으로 Vercel 발송. lazy·크론 양쪽 경로를 한 곳으로 통합.
--   · triggered_by = coalesce(auth.uid(), nil) — lazy(상자 연 사람)면 그 사람만 수신 제외(이미 보고 있음),
--     크론(유저 없음)이면 nil이라 제외 대상 없음 → 참여자 전원(상자 만든이 포함) 수신.
--   · anon 키는 공개키(NEXT_PUBLIC) — DB에 박아도 안전. 발송 secret은 엣지가 이미 보유.
-- 재실행 안전(create extension if not exists / create or replace / drop trigger if exists).

create extension if not exists pg_net;

create or replace function public.notify_box_closed_auto()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  perform net.http_post(
    url := 'https://aobsacjifamyrfmttllt.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYnNhY2ppZmFteXJmbXR0bGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTI3MzUsImV4cCI6MjA5NjY4ODczNX0.N2Vergro0ruaPcm6uf3YytYqcHIUR4ULlPyoujTRfFM',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvYnNhY2ppZmFteXJmbXR0bGx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTI3MzUsImV4cCI6MjA5NjY4ODczNX0.N2Vergro0ruaPcm6uf3YytYqcHIUR4ULlPyoujTRfFM'
    ),
    body := jsonb_build_object(
      'box_id', NEW.box_id,
      'triggered_by', coalesce(auth.uid()::text, '00000000-0000-0000-0000-000000000000'),
      'message_key', 'decision_auto'
    )
  );
  return NEW;
end; $$;

drop trigger if exists trg_box_closed_auto_push on public.box_activities;
create trigger trg_box_closed_auto_push
  after insert on public.box_activities
  for each row when (NEW.type = 'box_closed_auto')
  execute function public.notify_box_closed_auto();
