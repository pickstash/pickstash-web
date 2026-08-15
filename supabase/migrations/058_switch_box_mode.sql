-- 058_switch_box_mode.sql — 상자 종류(결정하기/모아보기) 상호 변경 허용.
-- 033은 "생성 시 고정, 변경 불가(새 상자로)"였으나, 사용자 요청으로 변경을 허용하기로 함 — 대신
-- 결정·체크·좋아요 기록이 전부 초기화된다는 걸 프론트에서 명시적으로 확인받은 뒤 호출한다.
-- DB 레벨엔 애초에 mode를 막는 트리거·제약이 없었다(check(mode in (...))만 존재) — 이 마이그레이션은
-- 전환 시 관련 파생 상태를 일관되게 초기화하는 RPC 하나만 추가한다. 재실행 안전.

create or replace function public.switch_box_mode(p_box_id uuid, p_mode text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception 'not_participant';
  end if;
  if p_mode not in ('decide', 'checklist') then
    raise exception 'invalid_mode';
  end if;

  -- 결정(decided_at)·체크(checked_at)·좋아요(votes)는 종류가 바뀌면 의미가 없어져 전부 초기화한다.
  update options set decided_at = null, checked_at = null where box_id = p_box_id;
  delete from votes where option_id in (select id from options where box_id = p_box_id);

  -- 결정 방식·마감·정리 상태도 함께 리셋(reopen_box와 동일 취지) — checkable은 create_box와 같은
  -- 규칙으로 decide는 항상 false, checklist는 기본 false(다시 켤 수 있음).
  update boxes set
    mode = p_mode,
    checkable = false,
    decision_mode = 'manual',
    deadline_at = null,
    closed_at = null,
    updated_at = now()
  where id = p_box_id;
end;
$$;

grant execute on function public.switch_box_mode(uuid, text) to authenticated;
