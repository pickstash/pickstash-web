-- 017_auto_close_overdue_boxes.sql — 마감 지난 auto_deadline 상자 자동 정리(정리완료 전환)
-- 문제: 상태는 closed_at에서 파생되고, auto_decide_box는 상자 상세/초대 뷰어를 '열람할 때만'
--       lazy commit 한다. 그래서 아무도 상자를 안 열면 마감이 지나도 closed_at이 안 써져
--       계속 '어질러진 창고(정리중)'에 남는다.
-- 해결: (1) 마감 지난 모든 auto 상자를 일괄 커밋하는 commit_overdue_boxes()
--       (2) pg_cron 1분마다 실행 → 아무도 안 열어도 자동으로 정리완료 전환
--       (3) auto_decide_box의 box_closed actor를 '첫 참여자' 우선으로(자동결정=시스템 이벤트라
--           우연히 상자를 연 사람이 아니라 상자 주인이 기록되게)
-- ⚠️ 좋아요가 0인 auto 상자는 의도적으로 안 닫힌다(정리중 유지 = 직접 정하기 폴백, spec §3-6).
-- 재실행 안전(create or replace / if not exists / unschedule 예외무시).

create extension if not exists pg_cron;

create or replace function public.auto_decide_box(p_box_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $$
declare v_max int; v_actor uuid;
begin
  if not exists (
    select 1 from boxes where id = p_box_id
      and decision_mode = 'auto_deadline' and closed_at is null
      and deadline_at is not null and deadline_at <= now()
  ) then return; end if;

  select max(cnt) into v_max from (
    select count(*) cnt from votes v join options o on o.id = v.option_id
    where o.box_id = p_box_id and v.vote_type = 'like' group by v.option_id
  ) t;
  if v_max is null or v_max = 0 then return; end if;  -- 선택지/좋아요 없음 → 폴백(정리중 유지)

  update options set decided_at = now()
  where box_id = p_box_id and id in (
    select o.id from options o join votes v on v.option_id = o.id and v.vote_type = 'like'
    where o.box_id = p_box_id group by o.id having count(*) = v_max
  );
  update boxes set closed_at = now() where id = p_box_id;

  v_actor := coalesce(
    (select user_id from box_participants where box_id = p_box_id order by joined_at limit 1),
    auth.uid()
  );
  if v_actor is not null then
    insert into box_activities (box_id, actor_id, type) values (p_box_id, v_actor, 'box_closed');
  end if;
end; $$;

-- 마감 지난 모든 auto 상자 일괄 커밋 (cron/홈 로드에서 호출)
create or replace function public.commit_overdue_boxes()
returns void language plpgsql security definer set search_path to 'public'
as $$
declare _id uuid;
begin
  for _id in
    select id from boxes
    where decision_mode = 'auto_deadline' and closed_at is null
      and deadline_at is not null and deadline_at <= now()
  loop
    perform public.auto_decide_box(_id);
  end loop;
end; $$;

grant execute on function public.commit_overdue_boxes() to authenticated, anon, service_role;

-- pg_cron: 1분마다 자동 실행 (idempotent — 기존 잡 있으면 제거 후 재등록)
do $$
begin
  perform cron.unschedule('commit-overdue-boxes');
exception when others then null;
end $$;

select cron.schedule('commit-overdue-boxes', '* * * * *', $cmd$select public.commit_overdue_boxes();$cmd$);
