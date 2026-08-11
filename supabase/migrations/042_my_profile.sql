-- 042_my_profile.sql — 내 프로필(인스타식) + 저장함(북마크) 조회 RPC
-- 개편 M3. 추가전용. public_box_card(040) 재사용. auth.uid() 기준. 재실행 안전.

-- 내 프로필 헤더 + 내 공개 상자 그리드 (handle 없어도 동작)
create or replace function get_my_profile()
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_uid uuid := auth.uid(); v_pr profiles;
begin
  if v_uid is null then return null; end if;
  select * into v_pr from profiles where id = v_uid;
  return jsonb_build_object(
    'id', v_pr.id, 'handle', v_pr.handle, 'nickname', v_pr.nickname, 'avatar_url', v_pr.avatar_url, 'bio', v_pr.bio,
    'followers', (select count(*) from follows where followee_id = v_uid),
    'following', (select count(*) from follows where follower_id = v_uid),
    'public_count', (select count(*) from boxes b where b.published_by = v_uid and b.visibility = 'public'),
    'boxes', coalesce((
      select jsonb_agg(public_box_card(b) order by b.published_at desc)
      from boxes b where b.published_by = v_uid and b.visibility = 'public'
    ), '[]'::jsonb)
  );
end; $$;

-- 저장함 — 내가 북마크한 공개 상자 카드(최근 저장순)
create or replace function get_my_bookmarks()
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(public_box_card(b) order by bm.created_at desc)
    from bookmarks bm join boxes b on b.id = bm.box_id
    where bm.user_id = v_uid
  ), '[]'::jsonb);
end; $$;

grant execute on function get_my_profile() to authenticated;
grant execute on function get_my_bookmarks() to authenticated;
