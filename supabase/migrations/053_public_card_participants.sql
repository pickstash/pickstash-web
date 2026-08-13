-- 053_public_card_participants.sql — 둘러보기 상자 카드에 '참여중 인원'(participant_count) 추가.
--   기존 정의(051에서 pinned_at 추가된 것)를 그대로 유지하고 participant_count 한 줄만 더한다(가산적·안전).
-- 재실행 안전. 코드 배포 전 대시보드에서 먼저 실행(안 하면 participant_count가 undefined라 인원 표시만 생략됨).

create or replace function public_box_card(b boxes)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'id', b.id, 'title', b.title, 'mode', b.mode, 'tags', to_jsonb(b.tags),
    'published_at', b.published_at, 'pinned_at', b.pinned_at, 'closed_at', b.closed_at,
    'winner', (select string_agg(o.name, ', ') from options o where o.box_id = b.id and o.decided_at is not null),
    'checked', (select count(*) from options o where o.box_id = b.id and o.checked_at is not null),
    'total', (select count(*) from options o where o.box_id = b.id),
    'participant_count', (select count(*) from box_participants bp where bp.box_id = b.id),
    'save_count', (select count(*) from bookmarks bm where bm.box_id = b.id),
    'author', (select jsonb_build_object('id', pr.id, 'handle', pr.handle, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url)
               from profiles pr where pr.id = b.published_by)
  );
$$;
