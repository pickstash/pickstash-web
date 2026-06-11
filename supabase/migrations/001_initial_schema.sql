-- 프로필 (auth.users 1:1)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- 상자
create table boxes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  memo text,
  deadline_at timestamptz not null,
  closed_at timestamptz,
  current_round int not null default 1,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 선택지
create table options (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references boxes(id) on delete cascade,
  name text not null,
  summary jsonb not null default '[]',
  links jsonb not null default '[]',
  memo text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

-- 투표
create table votes (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('like', 'dislike')),
  round int not null default 1,
  created_at timestamptz not null default now(),
  unique (option_id, user_id, round)
);

-- 상자 참여자
create table box_participants (
  box_id uuid not null references boxes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  primary key (box_id, user_id)
);

-- 그룹
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  owner_id uuid not null references profiles(id) on delete cascade,
  invite_code text not null unique default substr(md5(random()::text), 1, 8),
  created_at timestamptz not null default now()
);

-- 그룹 멤버
create table group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- 즐겨찾기
create table favorites (
  user_id uuid not null references profiles(id) on delete cascade,
  box_id uuid not null references boxes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, box_id)
);

-- 댓글
create table comments (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references options(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

-- 탈퇴 사유
create table withdraw_reasons (
  id uuid primary key default gen_random_uuid(),
  reasons jsonb not null default '[]',
  detail text,
  created_at timestamptz not null default now()
);
