-- 059_public_box_guest_comments.sql — 공개 상자는 비참여자도 댓글을 달 수 있게(게스트).
-- 배경: comments INSERT 정책이 애초부터 user_id=auth.uid()만 확인하고 상자 접근 권한은 전혀
--   확인하지 않았다(참여자 제한은 프론트 UI에서만 걸려 있었음) — can_read_box(box_id)로 명시해
--   "읽을 수 있으면(참여자·서랍 공유·공개 상자) 댓글도 달 수 있다"로 정리한다. 결과적으로 049에서
--   비로그인까지 열어준 공개 상자 열람에, 로그인한 비참여자(게스트)의 댓글 작성이 자연히 포함된다.
--   comment_likes SELECT는 048/052 정리에서 빠져 있었다(여전히 box_participants로만 판정) — 게스트가
--   단 댓글의 좋아요 수가 항상 0으로 보이는 걸 막기 위해 can_read_box 기준으로 함께 정리한다.
-- 재실행 안전.

drop policy if exists "comments: 본인 insert" on comments;
create policy "comments: 본인 insert" on comments for insert
  with check (user_id = auth.uid() and can_read_box(box_id));

drop policy if exists "comment_likes: 참여자 조회" on comment_likes;
create policy "comment_likes: 참여자 조회" on comment_likes for select
  using (exists (
    select 1 from comments c where c.id = comment_likes.comment_id and can_read_box(c.box_id)
  ));
