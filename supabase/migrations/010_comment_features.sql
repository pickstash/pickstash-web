-- 010_comment_features.sql — 댓글 답글(플랫 2단계)·수정·좋아요 지원
-- ① comments: 답글(parent_comment_id) + 수정 이력(edited_at)
-- ② comment_likes: 댓글 좋아요(참여자 누구나, 토글)
-- ③ Realtime publication에 comment_likes 추가
--
-- 여러 번 실행해도 안전(idempotent).

-- ─────────────────────────────────────────────
-- ① 답글 · 수정 이력
-- ─────────────────────────────────────────────
alter table comments add column if not exists parent_comment_id uuid references comments(id) on delete cascade;
alter table comments add column if not exists edited_at timestamptz;

-- 플랫 2단계 강제: 답글의 답글은 금지 (parent가 이미 답글이면 거부)
create or replace function enforce_flat_comment_reply() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.parent_comment_id is not null then
    if exists (
      select 1 from comments where id = new.parent_comment_id and parent_comment_id is not null
    ) then
      raise exception 'nested_reply_not_allowed';
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists trg_enforce_flat_comment_reply on comments;
create trigger trg_enforce_flat_comment_reply
  before insert on comments
  for each row execute function enforce_flat_comment_reply();

-- 댓글 수정 시 edited_at 자동 기록 (본문이 실제로 바뀐 경우만)
create or replace function mark_comment_edited() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.body is distinct from old.body then
    new.edited_at = now();
  end if;
  return new;
end; $$;

drop trigger if exists trg_mark_comment_edited on comments;
create trigger trg_mark_comment_edited
  before update on comments
  for each row execute function mark_comment_edited();

-- 댓글 본인 수정 허용 (기존엔 insert/delete만 있었음)
drop policy if exists "comments: 본인 수정" on comments;
create policy "comments: 본인 수정" on comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- ② 댓글 좋아요
-- ─────────────────────────────────────────────
create table if not exists comment_likes (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table comment_likes enable row level security;

drop policy if exists "comment_likes: 참여자 조회" on comment_likes;
create policy "comment_likes: 참여자 조회" on comment_likes for select
  using (exists (
    select 1 from comments c
    join options o on o.id = c.option_id
    join box_participants bp on bp.box_id = o.box_id
    where c.id = comment_likes.comment_id and bp.user_id = auth.uid()
  ));

drop policy if exists "comment_likes: 본인 insert" on comment_likes;
create policy "comment_likes: 본인 insert" on comment_likes for insert
  with check (user_id = auth.uid());

drop policy if exists "comment_likes: 본인 삭제" on comment_likes;
create policy "comment_likes: 본인 삭제" on comment_likes for delete
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- ③ Realtime: comment_likes 발행 등록 + FULL REPLICA(삭제 이벤트가 컬럼을 실어보내게)
-- ─────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'comment_likes'
  ) then
    alter publication supabase_realtime add table comment_likes;
  end if;
end $$;

alter table comment_likes replica identity full;
