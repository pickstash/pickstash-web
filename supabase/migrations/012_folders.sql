-- 012_folders.sql — 폴더 (주제별 상자 묶음, 사용자 정의). spec §3-7.
-- 개인별 폴더링: 사람마다 자기 폴더에 독립적으로 분류(box_folders 조인). 같은 상자를
--   나는 '여행', 친구는 '모임'에 따로 넣어도 안 부딪힘. 상자 owner·그룹(사람)과 무관.
-- 여러 번 실행해도 안전(idempotent).

-- 1) folders — 각자 자기 폴더
create table if not exists folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  sort int not null default 0,           -- 드로어 표시 순서
  created_at timestamptz not null default now()
);

-- 2) box_folders — "이 사용자가 이 상자를 이 폴더에 넣음". 사용자별 상자당 폴더 0~1개(PK로 단일 보장).
create table if not exists box_folders (
  user_id uuid not null references profiles(id) on delete cascade,
  box_id uuid not null references boxes(id) on delete cascade,
  folder_id uuid not null references folders(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, box_id)
);

create index if not exists folders_user_id_idx on folders(user_id);
create index if not exists box_folders_folder_idx on box_folders(folder_id);

-- 3) RLS — 폴더·분류 모두 본인 것만
alter table folders enable row level security;

drop policy if exists "folders: 본인 조회" on folders;
create policy "folders: 본인 조회" on folders for select using (user_id = auth.uid());

drop policy if exists "folders: 본인 insert" on folders;
create policy "folders: 본인 insert" on folders for insert with check (user_id = auth.uid());

drop policy if exists "folders: 본인 update" on folders;
create policy "folders: 본인 update" on folders for update using (user_id = auth.uid());

drop policy if exists "folders: 본인 delete" on folders;
create policy "folders: 본인 delete" on folders for delete using (user_id = auth.uid());

alter table box_folders enable row level security;

drop policy if exists "box_folders: 본인 조회" on box_folders;
create policy "box_folders: 본인 조회" on box_folders for select using (user_id = auth.uid());

drop policy if exists "box_folders: 본인 insert" on box_folders;
create policy "box_folders: 본인 insert" on box_folders for insert with check (user_id = auth.uid());

drop policy if exists "box_folders: 본인 update" on box_folders;
create policy "box_folders: 본인 update" on box_folders for update using (user_id = auth.uid());

drop policy if exists "box_folders: 본인 delete" on box_folders;
create policy "box_folders: 본인 delete" on box_folders for delete using (user_id = auth.uid());
