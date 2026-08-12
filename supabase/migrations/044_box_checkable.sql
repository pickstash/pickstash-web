-- 044: 모아보기(체크형) 상자에 '항목 체크 사용' 여부 플래그.
--   모아보기 = 항목을 모아두는 리스트가 본질, 체크는 선택. 상자 생성 시 정하고 이후 고정(mode처럼).
--   · 기존 체크형 상자는 체크 리스트로 쓰이던 것 → default true로 보존(백필 update 없이 재실행 안전).
--   · 신규 상자는 create_box가 p_checkable을 명시(UI 기본 꺼짐 → false).
--
-- ⚠️ 무중단 주의: 라이브 main은 아직 5-arg create_box(033)를 호출한다. 여기에 default 붙은
--    파라미터를 더해 6-arg로 바꾸면 5-arg 명명 호출이 모호(ambiguous)해져 라이브 상자생성이 깨진다.
--    → 5-arg(033)는 그대로 두고, default 없는 6-arg 오버로드를 '추가'한다. arg 개수가 달라 모호성 없음.
--    5-arg 경로는 checkable을 명시 안 하므로 컬럼 default(true) 적용 = 기존 동작 그대로.
-- 재실행 안전(add column if not exists / create or replace).

alter table public.boxes add column if not exists checkable boolean not null default true;

create or replace function public.create_box(
  p_title text,
  p_memo text,
  p_decision_mode text,
  p_deadline_at timestamptz,
  p_mode text,
  p_checkable boolean
) returns public.boxes
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  _uid uuid := auth.uid();
  _id  uuid := gen_random_uuid();
  _box public.boxes;
begin
  if _uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.boxes (id, title, memo, decision_mode, deadline_at, mode, checkable)
  values (
    _id,
    p_title,
    nullif(p_memo, ''),
    case when p_mode = 'checklist' then 'manual' else coalesce(p_decision_mode, 'manual') end,
    case when p_mode = 'checklist' or p_decision_mode <> 'auto_deadline' then null else p_deadline_at end,
    coalesce(p_mode, 'decide'),
    -- 체크 사용 여부는 모아보기(checklist)에서만 의미. 결정형은 항상 false.
    case when p_mode = 'checklist' then coalesce(p_checkable, false) else false end
  );

  insert into public.box_participants (box_id, user_id) values (_id, _uid);

  select * into _box from public.boxes where id = _id;
  return _box;
end;
$$;

grant execute on function public.create_box(text, text, text, timestamptz, text, boolean) to authenticated;
