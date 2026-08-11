-- 039_bookmarks.sql — 북마크(공개 상자 저장 = 프로필 '저장함')
-- 개편 M2. 추가전용(신규 테이블). 재실행 안전. (옛 favorites=내 상자 별표와 별개.)

create table if not exists bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  box_id uuid not null references boxes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, box_id)
);

create index if not exists bookmarks_user_recent_idx on bookmarks (user_id, created_at desc);

alter table bookmarks enable row level security;

-- 본인 북마크만 조회·추가·삭제.
drop policy if exists bookmarks_select on bookmarks;
create policy bookmarks_select on bookmarks for select using (user_id = auth.uid());

drop policy if exists bookmarks_insert on bookmarks;
create policy bookmarks_insert on bookmarks for insert with check (user_id = auth.uid());

drop policy if exists bookmarks_delete on bookmarks;
create policy bookmarks_delete on bookmarks for delete using (user_id = auth.uid());
