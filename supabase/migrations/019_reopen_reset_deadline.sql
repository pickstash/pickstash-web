-- 019_reopen_reset_deadline.sql — 다시 열기(번복) 시 마감일·결정방식 초기화
-- 변경: reopen_box가 closed_at·decided_at만 지우던 것을, deadline_at=null·decision_mode='manual'까지
--       초기화한다. 다시 연 상자는 '직접 정하기 + 마감 없음' 기본 상태가 되고, 클라이언트는 이어서
--       결정방식 모달을 띄워 사용자가 방식을 다시 고르게 한다(사용자 요청 2026-07-29).
-- 재실행 안전(create or replace).

create or replace function public.reopen_box(p_box_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception 'not_participant';
  end if;
  update boxes
    set closed_at = null, deadline_at = null, decision_mode = 'manual', updated_at = now()
    where id = p_box_id;
  update options set decided_at = null where box_id = p_box_id and decided_at is not null;
  insert into box_activities (box_id, actor_id, type) values (p_box_id, auth.uid(), 'box_reopened');
end; $$;
