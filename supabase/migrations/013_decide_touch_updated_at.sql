-- 013_decide_touch_updated_at.sql
-- 결정(decide_box)·번복(reopen_box) 시 boxes.updated_at을 갱신한다.
-- 배경: 목록(어질러진/정리된 창고)의 "N" 배지·정렬은 updated_at 기준인데(messy/done page),
--   기존 decide_box/reopen_box는 closed_at/decided_at만 바꾸고 updated_at은 두어서,
--   누가 상자를 결정해도 다른 참여자 목록엔 N도 안 뜨고 위로 재정렬도 안 됐다(제목/메모 편집은 뜸).
-- 함수 본문만 교체(create or replace) — 스키마·데이터 변경 없음. 여러 번 실행해도 안전(idempotent).
-- ⚠️ 라이브 반영: 대시보드 SQL Editor에서 이 파일을 실행해야 적용된다(파일만으론 라이브 함수 안 바뀜).

-- 결정: 선택한 옵션(들) 결정 표시 + 정리완료 (+ updated_at 갱신)
create or replace function decide_box(p_box_id uuid, p_option_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception 'not_participant';
  end if;
  update options set decided_at = now()  where box_id = p_box_id and id = any(p_option_ids);
  update options set decided_at = null   where box_id = p_box_id and not (id = any(p_option_ids));
  update boxes   set closed_at  = now(), updated_at = now() where id = p_box_id;
  insert into box_activities (box_id, actor_id, type) values (p_box_id, auth.uid(), 'box_closed');
end; $$;

-- 번복(다시 정리하기): 정리완료·결정 해제 → 정리중 복귀 (+ updated_at 갱신)
create or replace function reopen_box(p_box_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception 'not_participant';
  end if;
  update boxes   set closed_at  = null, updated_at = now() where id = p_box_id;
  update options set decided_at = null where box_id = p_box_id and decided_at is not null;
  insert into box_activities (box_id, actor_id, type) values (p_box_id, auth.uid(), 'box_reopened');
end; $$;
