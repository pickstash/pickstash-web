-- 016_create_box_rpc.sql — 상자 생성 원자화 (버그 수정)
-- 문제: 앱이 boxes를 .insert().select() (= INSERT ... RETURNING) 로 만드는데,
--       RETURNING 행에 boxes의 SELECT 정책(EXISTS box_participants)이 적용된다.
--       신규 상자엔 참여자 행이 아직 없어(참여자는 그 다음에 별도 insert) SELECT 정책이
--       거부 → "new row violates row-level security policy for table boxes" (42501).
-- 해결: 상자 + 생성자 참여자 행을 한 함수에서 원자적으로 넣고, 참여자가 생긴 뒤 상자를 조회해 반환.
--       SECURITY INVOKER(RLS 준수): boxes INSERT(RETURNING 없음)·participants INSERT·최종 SELECT 모두 정책 통과.
-- 재실행 안전(create or replace). ⚠️ 라이브 DB: 이 RPC를 호출하는 코드를 push하기 전에 먼저 적용할 것.

create or replace function public.create_box(
  p_title text,
  p_memo text default null,
  p_decision_mode text default 'manual',
  p_deadline_at timestamptz default null
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

  insert into public.boxes (id, title, memo, decision_mode, deadline_at)
  values (
    _id,
    p_title,
    nullif(p_memo, ''),
    coalesce(p_decision_mode, 'manual'),
    case when p_decision_mode = 'auto_deadline' then p_deadline_at else null end
  );

  insert into public.box_participants (box_id, user_id) values (_id, _uid);

  select * into _box from public.boxes where id = _id;
  return _box;
end;
$$;

grant execute on function public.create_box(text, text, text, timestamptz) to authenticated;
