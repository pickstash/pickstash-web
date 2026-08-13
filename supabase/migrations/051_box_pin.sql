-- 051_box_pin.sql — 프로필 '공개한 상자' 상단 고정(핀). 본인 공개 상자 최대 3개.
--   boxes.pinned_at: null=미고정, 값=고정(고정 시각). 프로필 피드는 고정 먼저 → 그다음 published_at desc.
--   set_box_pin: 소유자(published_by=auth.uid())의 공개 상자만, 상한 3(PIN_LIMIT).
-- 재실행 안전(add column if not exists / create or replace). 코드 배포 '전' 대시보드에서 먼저 실행.

alter table boxes add column if not exists pinned_at timestamptz;

-- 카드 요약에 pinned_at 추가(프로필 카드의 📌 배지용). 나머지는 040 정의와 동일.
create or replace function public_box_card(b boxes)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'id', b.id, 'title', b.title, 'mode', b.mode, 'tags', to_jsonb(b.tags),
    'published_at', b.published_at, 'pinned_at', b.pinned_at, 'closed_at', b.closed_at,
    'winner', (select string_agg(o.name, ', ') from options o where o.box_id = b.id and o.decided_at is not null),
    'checked', (select count(*) from options o where o.box_id = b.id and o.checked_at is not null),
    'total', (select count(*) from options o where o.box_id = b.id),
    'save_count', (select count(*) from bookmarks bm where bm.box_id = b.id),
    'author', (select jsonb_build_object('id', pr.id, 'handle', pr.handle, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url)
               from profiles pr where pr.id = b.published_by)
  );
$$;

-- 내 프로필 — 공개 상자를 고정 먼저 정렬(그 외 046과 동일).
create or replace function get_my_profile()
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_uid uuid := auth.uid(); v_pr profiles;
begin
  if v_uid is null then return null; end if;
  select * into v_pr from profiles where id = v_uid;
  return jsonb_build_object(
    'id', v_pr.id, 'handle', v_pr.handle, 'nickname', v_pr.nickname, 'avatar_url', v_pr.avatar_url,
    'bio', v_pr.bio, 'tags', to_jsonb(v_pr.tags),
    'followers', (select count(*) from follows where followee_id = v_uid),
    'following', (select count(*) from follows where follower_id = v_uid),
    'public_count', (select count(*) from boxes b where b.published_by = v_uid and b.visibility = 'public'),
    'boxes', coalesce((
      select jsonb_agg(public_box_card(b) order by (b.pinned_at is not null) desc, b.pinned_at desc, b.published_at desc)
      from boxes b where b.published_by = v_uid and b.visibility = 'public'
    ), '[]'::jsonb)
  );
end; $$;

-- 남의 공개 프로필 — 동일하게 고정 먼저.
create or replace function get_profile_feed(p_handle text)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_pr profiles;
begin
  select * into v_pr from profiles where lower(handle) = lower(p_handle);
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_pr.id, 'handle', v_pr.handle, 'nickname', v_pr.nickname, 'avatar_url', v_pr.avatar_url,
    'bio', v_pr.bio, 'tags', to_jsonb(v_pr.tags),
    'followers', (select count(*) from follows where followee_id = v_pr.id),
    'following', (select count(*) from follows where follower_id = v_pr.id),
    'public_count', (select count(*) from boxes b where b.published_by = v_pr.id and b.visibility = 'public'),
    'boxes', coalesce((
      select jsonb_agg(public_box_card(b) order by (b.pinned_at is not null) desc, b.pinned_at desc, b.published_at desc)
      from boxes b where b.published_by = v_pr.id and b.visibility = 'public'
    ), '[]'::jsonb)
  );
end;
$$;

-- 고정/해제 — 소유자의 공개 상자만. 고정은 최대 3개(초과 시 PIN_LIMIT). 이미 고정이면 재고정 통과(멱등).
create or replace function set_box_pin(p_box_id uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_owner uuid; v_cur timestamptz;
begin
  if v_uid is null then raise exception 'auth required'; end if;
  select published_by, pinned_at into v_owner, v_cur
    from boxes where id = p_box_id and visibility = 'public';
  if v_owner is null or v_owner <> v_uid then
    raise exception 'not your public box';
  end if;

  if p_pinned then
    if v_cur is null and (
      select count(*) from boxes
      where published_by = v_uid and visibility = 'public' and pinned_at is not null
    ) >= 3 then
      raise exception 'PIN_LIMIT';
    end if;
    update boxes set pinned_at = now() where id = p_box_id;
  else
    update boxes set pinned_at = null where id = p_box_id;
  end if;
end;
$$;

grant execute on function get_my_profile() to authenticated;
grant execute on function get_profile_feed(text) to anon, authenticated;
grant execute on function set_box_pin(uuid, boolean) to authenticated;
