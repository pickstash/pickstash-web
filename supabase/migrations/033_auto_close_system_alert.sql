-- 033_auto_close_system_alert.sql — 자동마감을 '시스템 이벤트'로 남겨 알림함에 전원 노출
-- 문제: auto_decide_box가 box_closed(actor=첫 참여자)를 남겨서
--   (1) getAlerts의 '내 활동 제외'(actor_id != me)에 걸려, 상자 만든 사람(=첫 참여자)은
--       자기 상자 자동정리 알림을 못 봤다 → 홈에서 조용히 사라진 것처럼 느낌.
--   (2) '○○님이 결정을 확정했어요'로 사람이 한 것처럼 표시됐다(실제론 마감이 정한 것).
-- 해결: 자동마감 전용 타입 box_closed_auto로 남긴다.
--   · 앱: getAlerts가 이 타입은 actor 무관하게 모든 참여자에게 노출, 라벨은 '마감돼 정리됐어요'(이름 없음).
--   · 수동 결정(decide_box)은 종전대로 box_closed(actor=본인) 유지.
-- actor_id는 여전히 non-null(첫 참여자)로 컬럼 제약 만족. type은 text(제약 없음)라 값 추가 자유.
-- 재실행 안전(create or replace). 018 본문에서 insert 타입만 변경.

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
    -- 자동마감 = 시스템 이벤트 → box_closed_auto (수동 결정의 box_closed와 구분)
    insert into box_activities (box_id, actor_id, type) values (p_box_id, v_actor, 'box_closed_auto');
  end if;
end; $$;
