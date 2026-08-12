-- 046_profile_tags.sql — 프로필 관심 해시태그(#여행 #맛집) + 사람 검색에 태그 매칭.
--   bio(한줄소개)는 이미 존재(036) — 편집 UI만 추가되며 여기선 스키마 변경 없음.
--   tags: text[] 관심 태그. search_public이 handle·nickname뿐 아니라 이 태그로도 사람을 찾게 한다.
-- 재실행 안전(add column if not exists / create or replace).

alter table profiles add column if not exists tags text[] not null default '{}';

-- 내 프로필 — tags 포함(설정 편집 프리필·표시)
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
      select jsonb_agg(public_box_card(b) order by b.published_at desc)
      from boxes b where b.published_by = v_uid and b.visibility = 'public'
    ), '[]'::jsonb)
  );
end; $$;

-- 남의 공개 프로필 — tags 포함(표시)
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
      select jsonb_agg(public_box_card(b) order by b.published_at desc)
      from boxes b where b.published_by = v_pr.id and b.visibility = 'public'
    ), '[]'::jsonb)
  );
end;
$$;

-- 검색 — 사람: handle·nickname·태그 매칭. 태그를 결과에 포함(칩 표시).
create or replace function search_public(p_q text, p_limit int default 20)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'boxes', coalesce((
      select jsonb_agg(card order by pub desc) from (
        select public_box_card(b) as card, b.published_at as pub
        from boxes b
        where b.visibility = 'public'
          and (b.title ilike '%' || p_q || '%' or exists (select 1 from unnest(b.tags) t where t ilike '%' || p_q || '%'))
        order by b.published_at desc
        limit p_limit
      ) t
    ), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(person) from (
        select jsonb_build_object(
                 'id', pr.id, 'handle', pr.handle, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url,
                 'bio', pr.bio, 'tags', to_jsonb(pr.tags),
                 'followers', (select count(*) from follows where followee_id = pr.id),
                 'public_count', (select count(*) from boxes b where b.published_by = pr.id and b.visibility = 'public')
               ) as person
        from profiles pr
        where pr.handle is not null
          and (pr.handle ilike '%' || p_q || '%'
               or pr.nickname ilike '%' || p_q || '%'
               or exists (select 1 from unnest(pr.tags) t where t ilike '%' || p_q || '%'))
        limit p_limit
      ) t
    ), '[]'::jsonb)
  );
$$;

grant execute on function get_my_profile() to authenticated;
grant execute on function get_profile_feed(text) to anon, authenticated;
grant execute on function search_public(text, int) to anon, authenticated;
