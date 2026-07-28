-- 014_public_box_view.sql — 로그인 안 한 사용자도 초대 링크로 상자 전체를 '읽기 전용'으로 열람.
-- 노션식 "링크 = 뷰어": 예측 불가한 invite_code(8자)를 아는 누구나 읽기 전용으로 상자를 본다.
--   · security definer로 RLS를 우회하되 invite_code로만 제한 노출 — 기존 get_box_preview_by_invite_code와 동일 패턴.
--   · 반환 = 상자 1건의 전체 스냅샷(jsonb): 상자·참여자·선택지(내용/결정/좋아요수)·댓글(답글/좋아요수/작성자).
--   · 순수 조회(쓰기 없음). RLS 정책은 그대로 — 참여·투표·댓글 등 '쓰기'는 여전히 로그인+참여자만 가능.
-- ⚠️ 라이브 DB: 코드 push 전에 대시보드에서 먼저 적용. 여러 번 실행해도 안전(create or replace).

create or replace function get_box_view_by_invite_code(p_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id',                b.id,
    'title',             b.title,
    'memo',              b.memo,
    'decision_mode',     b.decision_mode,
    'deadline_at',       b.deadline_at,
    'closed_at',         b.closed_at,
    'created_at',        b.created_at,
    'updated_at',        b.updated_at,
    'invite_code',       b.invite_code,
    'participant_count', (select count(*) from box_participants bp where bp.box_id = b.id),
    'participants', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', pr.id, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url)
               order by bp.joined_at
             )
      from box_participants bp
      join profiles pr on pr.id = bp.user_id
      where bp.box_id = b.id
    ), '[]'::jsonb),
    'options', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',         o.id,
                 'name',       o.name,
                 'content',    o.content,
                 'decided_at', o.decided_at,
                 'created_at', o.created_at,
                 'created_by', o.created_by,
                 'like_count', (
                   select count(*) from votes v
                   where v.option_id = o.id and v.vote_type = 'like'
                 ),
                 'comments', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'id',                c.id,
                              'body',              c.body,
                              'parent_comment_id', c.parent_comment_id,
                              'edited_at',         c.edited_at,
                              'created_at',        c.created_at,
                              'user_id',           c.user_id,
                              'nickname',          cp.nickname,
                              'avatar_url',        cp.avatar_url,
                              'like_count',        (
                                select count(*) from comment_likes cl
                                where cl.comment_id = c.id
                              )
                            )
                            order by c.created_at
                          )
                   from comments c
                   join profiles cp on cp.id = c.user_id
                   where c.option_id = o.id
                 ), '[]'::jsonb)
               )
               order by o.created_at
             )
      from options o
      where o.box_id = b.id
    ), '[]'::jsonb)
  )
  from boxes b
  where b.invite_code = p_code;
$$;

-- 익명(anon)·로그인(authenticated) 모두 실행 가능해야 링크 뷰어가 동작한다.
grant execute on function get_box_view_by_invite_code(text) to anon, authenticated;
