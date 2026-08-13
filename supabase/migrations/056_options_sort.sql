-- 056_options_sort.sql — 모아보기(체크형) 항목 드래그 정렬용 순서 컬럼.
--   기존엔 created_at 순으로만 로드했다. 참여자가 드래그로 정한 순서를 저장할 곳을 둔다.
--   default 0 → 기존 항목은 전부 0(동점)이라 created_at tiebreak로 지금과 동일한 순서 유지.
--   재실행 안전. 코드 배포 전 대시보드에서 먼저 실행(안 하면 sort 미존재로 조회 오류).
alter table options add column if not exists sort int not null default 0;

-- 항목 순서 일괄 갱신 — p_ids 배열 순서대로 options.sort = 0..n-1. 참여자만(편집 개방 008).
create or replace function reorder_options(p_box_id uuid, p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception '참여자만 순서를 바꿀 수 있어요';
  end if;
  update options o set sort = t.ord - 1
  from unnest(p_ids) with ordinality as t(id, ord)
  where o.id = t.id and o.box_id = p_box_id;
end $$;
grant execute on function reorder_options(uuid, uuid[]) to authenticated;
