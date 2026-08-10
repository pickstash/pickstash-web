-- 035_fix_box_closed_auto_constraint.sql — 자동종료 복구
-- 문제: 033이 auto_decide_box를 box_closed_auto 활동으로 바꿨는데 box_activities_type_check
--   CHECK 제약에 그 값을 안 넣어서, 자동마감 때 insert가 제약 위반 → auto_decide_box 롤백
--   → 마감 지나도 상자가 안 닫혔다(크론이 매분 실패). 또 pg_net 푸시 트리거가 예외를 던지면
--   insert(=닫기 트랜잭션)를 통째로 막을 수 있어 방어가 필요.
-- 해결: (1) CHECK 제약에 box_closed_auto 추가.
--       (2) notify_box_closed_auto가 push 실패를 삼켜(warning만) 상자 닫기를 절대 막지 않게.
-- 재실행 안전(drop constraint if exists / create or replace).

alter table public.box_activities drop constraint if exists box_activities_type_check;
alter table public.box_activities add constraint box_activities_type_check
  check (type = any (array[
    'option_added', 'vote_cast', 'comment_added',
    'box_closed', 'box_closed_auto',
    'box_reopened', 'rematch_started', 'deadline_changed',
    'participant_joined', 'invited'
  ]));

create or replace function public.notify_box_closed_auto()
returns trigger language plpgsql security definer set search_path to 'public'
as $$
begin
  -- 푸시는 부수효과 — 실패해도 상자 닫기(트랜잭션)를 막지 않도록 예외를 삼킨다.
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
  exception when others then
    raise warning 'notify_box_closed_auto push failed: %', sqlerrm;
  end;
  return NEW;
end; $$;
