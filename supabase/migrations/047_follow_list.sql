-- 047_follow_list.sql — 팔로워/팔로잉 사람 목록 조회.
--   p_kind='followers' → p_user_id를 팔로우하는 사람들(f.followee_id = p_user_id, 사람=follower)
--   p_kind='following' → p_user_id가 팔로우하는 사람들(f.follower_id = p_user_id, 사람=followee)
--   반환 형태는 사람 검색(PersonResult)과 동일 — 목록 행·팔로우 버튼 재사용.
-- 재실행 안전(create or replace).

create or replace function get_follow_list(p_user_id uuid, p_kind text default 'followers')
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', pr.id, 'handle', pr.handle, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url,
      'bio', pr.bio, 'tags', to_jsonb(pr.tags),
      'followers', (select count(*) from follows where followee_id = pr.id),
      'public_count', (select count(*) from boxes b where b.published_by = pr.id and b.visibility = 'public')
    ) order by f.created_at desc
  ), '[]'::jsonb)
  from follows f
  join profiles pr on pr.id = (case when p_kind = 'following' then f.followee_id else f.follower_id end)
  where (case when p_kind = 'following' then f.follower_id else f.followee_id end) = p_user_id;
$$;

grant execute on function get_follow_list(uuid, text) to authenticated;
