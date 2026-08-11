-- 038_follows.sql — 팔로우(단방향, 인스타식)
-- 개편 M2. 추가전용(신규 테이블). 재실행 안전.

create table if not exists follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  constraint follows_no_self check (follower_id <> followee_id)
);

create index if not exists follows_followee_idx on follows (followee_id);

alter table follows enable row level security;

-- SELECT: 로그인 유저는 팔로우 관계 조회 가능(카운트·목록·내 팔로우 여부).
drop policy if exists follows_select on follows;
create policy follows_select on follows for select
  using (auth.uid() is not null);

-- INSERT/DELETE: 본인 팔로우만 추가·해제.
drop policy if exists follows_insert on follows;
create policy follows_insert on follows for insert
  with check (follower_id = auth.uid());

drop policy if exists follows_delete on follows;
create policy follows_delete on follows for delete
  using (follower_id = auth.uid());
