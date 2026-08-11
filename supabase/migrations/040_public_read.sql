-- 040_public_read.sql — 공개 상자 열람/탐색 (security definer, 익명화 포함)
-- 개편 M2. 참여자 전용 RLS를 우회하되 visibility='public' 인 것만 노출(014 패턴).
-- 익명화(결정4): 여럿(참여자 2+) 상자는 남 신원만 가림(댓글 작성자 '익명', 내용은 유지). 혼자 상자는 전체.
-- 순수 조회(쓰기 없음). 재실행 안전. anon/authenticated 실행 허용.

-- 1) 공개 상자 1건 스냅샷 (익명화)
create or replace function get_public_box_view(p_box_id uuid)
returns jsonb
language plpgsql security definer set search_path = public stable
as $$
declare
  v_box boxes;
  v_shared boolean;
begin
  select * into v_box from boxes where id = p_box_id and visibility = 'public';
  if not found then return null; end if;
  v_shared := (select count(*) from box_participants where box_id = p_box_id) > 1;

  return jsonb_build_object(
    'id', v_box.id, 'title', v_box.title, 'memo', v_box.memo,
    'mode', v_box.mode, 'decision_mode', v_box.decision_mode,
    'deadline_at', v_box.deadline_at, 'closed_at', v_box.closed_at,
    'created_at', v_box.created_at, 'tags', to_jsonb(v_box.tags),
    'participant_count', (select count(*) from box_participants where box_id = v_box.id),
    'is_shared', v_shared,
    'author', (
      select jsonb_build_object('handle', pr.handle, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url)
      from profiles pr where pr.id = v_box.published_by
    ),
    'options', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', o.id, 'name', o.name, 'content', o.content,
          'decided_at', o.decided_at, 'checked_at', o.checked_at, 'created_at', o.created_at,
          'like_count', (select count(*) from votes v where v.option_id = o.id and v.vote_type = 'like'),
          'comments', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', c.id, 'body', c.body, 'parent_comment_id', c.parent_comment_id,
                'created_at', c.created_at, 'edited_at', c.edited_at,
                -- 여럿 상자면 작성자 신원만 가림(내용 유지)
                'nickname', case when v_shared then '익명' else cp.nickname end,
                'avatar_url', case when v_shared then null else cp.avatar_url end,
                'like_count', (select count(*) from comment_likes cl where cl.comment_id = c.id)
              ) order by c.created_at
            )
            from comments c join profiles cp on cp.id = c.user_id where c.option_id = o.id
          ), '[]'::jsonb)
        ) order by o.created_at
      )
      from options o where o.box_id = v_box.id
    ), '[]'::jsonb)
  );
end;
$$;

-- 공개 상자 카드 1건 요약(피드·검색·프로필 공용)
create or replace function public_box_card(b boxes)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'id', b.id, 'title', b.title, 'mode', b.mode, 'tags', to_jsonb(b.tags),
    'published_at', b.published_at, 'closed_at', b.closed_at,
    'winner', (select string_agg(o.name, ', ') from options o where o.box_id = b.id and o.decided_at is not null),
    'checked', (select count(*) from options o where o.box_id = b.id and o.checked_at is not null),
    'total', (select count(*) from options o where o.box_id = b.id),
    'save_count', (select count(*) from bookmarks bm where bm.box_id = b.id),
    'author', (select jsonb_build_object('id', pr.id, 'handle', pr.handle, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url)
               from profiles pr where pr.id = b.published_by)
  );
$$;

-- 2) 공개 피드 (최근순)
create or replace function get_public_feed(p_limit int default 20, p_offset int default 0)
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(public_box_card(b) order by b.published_at desc), '[]'::jsonb)
  from boxes b where b.visibility = 'public'
  order by b.published_at desc
  limit p_limit offset p_offset;
$$;

-- 3) 프로필 피드 (핸들의 공개 상자 + 헤더)
create or replace function get_profile_feed(p_handle text)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_pr profiles;
begin
  select * into v_pr from profiles where lower(handle) = lower(p_handle);
  if not found then return null; end if;
  return jsonb_build_object(
    'id', v_pr.id, 'handle', v_pr.handle, 'nickname', v_pr.nickname, 'avatar_url', v_pr.avatar_url, 'bio', v_pr.bio,
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

-- 4) 검색 (공개 상자 제목·태그 + 사람 핸들·닉네임)
create or replace function search_public(p_q text, p_limit int default 20)
returns jsonb language sql security definer set search_path = public stable as $$
  select jsonb_build_object(
    'boxes', coalesce((
      select jsonb_agg(public_box_card(b) order by b.published_at desc)
      from boxes b
      where b.visibility = 'public'
        and (b.title ilike '%' || p_q || '%' or exists (select 1 from unnest(b.tags) t where t ilike '%' || p_q || '%'))
      limit p_limit
    ), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', pr.id, 'handle', pr.handle, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url, 'bio', pr.bio,
               'followers', (select count(*) from follows where followee_id = pr.id),
               'public_count', (select count(*) from boxes b where b.published_by = pr.id and b.visibility = 'public')
             ))
      from profiles pr
      where pr.handle is not null and (pr.handle ilike '%' || p_q || '%' or pr.nickname ilike '%' || p_q || '%')
      limit p_limit
    ), '[]'::jsonb)
  );
$$;

grant execute on function get_public_box_view(uuid) to anon, authenticated;
grant execute on function get_public_feed(int, int) to anon, authenticated;
grant execute on function get_profile_feed(text) to anon, authenticated;
grant execute on function search_public(text, int) to anon, authenticated;
