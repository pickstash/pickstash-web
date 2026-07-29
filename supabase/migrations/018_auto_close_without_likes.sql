-- 018_auto_close_without_likes.sql — 마감 지난 auto 상자는 좋아요 0이어도 '결정 없이' 정리완료
-- 변경: 기존엔 좋아요 0이면 auto_decide_box가 return해서 마감 지나도 안 닫혔고(정리중),
--       auto 모드엔 수동 결정 버튼도 없어 막혔다(dead end).
--       → 사용자 결정(2026-07-29): 좋아요 0이어도 마감이면 그냥 닫는다(결정 옵션 없이 '결정 없이 마무리').
--       좋아요가 있으면 종전대로 최다 옵션을 decided로 표시. UI(정리완료 카드)는 decidedOptions 0이면
--       '결정 없이 마무리됐어요'를 이미 렌더하므로 앱 변경 불필요.
-- 재실행 안전(create or replace).

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

  -- 좋아요가 있으면 최다 득표 옵션(들)에 결정 표시 (없으면 결정 없이 마무리)
  select max(cnt) into v_max from (
    select count(*) cnt from votes v join options o on o.id = v.option_id
    where o.box_id = p_box_id and v.vote_type = 'like' group by v.option_id
  ) t;

  if v_max is not null and v_max > 0 then
    update options set decided_at = now()
    where box_id = p_box_id and id in (
      select o.id from options o join votes v on v.option_id = o.id and v.vote_type = 'like'
      where o.box_id = p_box_id group by o.id having count(*) = v_max
    );
  end if;

  -- 좋아요 유무와 무관하게 마감이면 닫는다
  update boxes set closed_at = now() where id = p_box_id;

  v_actor := coalesce(
    (select user_id from box_participants where box_id = p_box_id order by joined_at limit 1),
    auth.uid()
  );
  if v_actor is not null then
    insert into box_activities (box_id, actor_id, type) values (p_box_id, v_actor, 'box_closed');
  end if;
end; $$;
