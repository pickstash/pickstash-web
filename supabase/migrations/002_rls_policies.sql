-- RLS 활성화
alter table profiles enable row level security;
alter table boxes enable row level security;
alter table options enable row level security;
alter table votes enable row level security;
alter table box_participants enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table favorites enable row level security;
alter table comments enable row level security;
alter table withdraw_reasons enable row level security;

-- profiles: 본인만 수정, 모든 인증 유저가 조회 가능
create policy "profiles: 본인 조회" on profiles for select using (auth.uid() is not null);
create policy "profiles: 본인 insert" on profiles for insert with check (id = auth.uid());
create policy "profiles: 본인 update" on profiles for update using (id = auth.uid());

-- boxes: 참여자만 조회/수정, owner만 update/delete
create policy "boxes: 참여자 조회" on boxes for select
  using (exists (select 1 from box_participants where box_id = id and user_id = auth.uid()));

create policy "boxes: 인증 유저 생성" on boxes for insert
  with check (owner_id = auth.uid());

create policy "boxes: owner 수정" on boxes for update
  using (exists (select 1 from box_participants where box_id = id and user_id = auth.uid() and role = 'owner'));

create policy "boxes: owner 삭제" on boxes for delete
  using (owner_id = auth.uid());

-- options: 참여자만 조회/추가, 작성자 또는 owner만 수정/삭제
create policy "options: 참여자 조회" on options for select
  using (exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid()));

create policy "options: 참여자 추가" on options for insert
  with check (
    created_by = auth.uid() and
    exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid())
  );

create policy "options: 작성자·owner 수정" on options for update
  using (
    created_by = auth.uid() or
    exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid() and role = 'owner')
  );

create policy "options: 작성자·owner 삭제" on options for delete
  using (
    created_by = auth.uid() or
    exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid() and role = 'owner')
  );

-- votes: 참여자만 조회, 본인만 insert/update/delete
create policy "votes: 참여자 조회" on votes for select
  using (exists (
    select 1 from options o
    join box_participants bp on bp.box_id = o.box_id
    where o.id = votes.option_id and bp.user_id = auth.uid()
  ));

create policy "votes: 본인 insert" on votes for insert
  with check (user_id = auth.uid());

create policy "votes: 본인 update" on votes for update
  using (user_id = auth.uid());

create policy "votes: 본인 delete" on votes for delete
  using (user_id = auth.uid());

-- box_participants: 참여자만 조회, 본인 row 삭제(나가기)
create policy "box_participants: 참여자 조회" on box_participants for select
  using (exists (select 1 from box_participants bp where bp.box_id = box_participants.box_id and bp.user_id = auth.uid()));

create policy "box_participants: 인증 유저 insert" on box_participants for insert
  with check (user_id = auth.uid());

create policy "box_participants: 본인 update" on box_participants for update
  using (user_id = auth.uid());

create policy "box_participants: 본인 삭제" on box_participants for delete
  using (user_id = auth.uid());

-- groups: 멤버만 조회, owner만 수정
create policy "groups: 멤버 조회" on groups for select
  using (exists (select 1 from group_members where group_id = groups.id and user_id = auth.uid()));

create policy "groups: 인증 유저 생성" on groups for insert
  with check (owner_id = auth.uid());

create policy "groups: owner 수정" on groups for update
  using (owner_id = auth.uid());

create policy "groups: owner 삭제" on groups for delete
  using (owner_id = auth.uid());

-- group_members: 멤버 조회, 본인 insert/delete
create policy "group_members: 멤버 조회" on group_members for select
  using (exists (select 1 from group_members gm where gm.group_id = group_members.group_id and gm.user_id = auth.uid()));

create policy "group_members: 본인 insert" on group_members for insert
  with check (user_id = auth.uid());

create policy "group_members: 본인 삭제" on group_members for delete
  using (user_id = auth.uid());

-- favorites: 본인만
create policy "favorites: 본인 조회" on favorites for select using (user_id = auth.uid());
create policy "favorites: 본인 insert" on favorites for insert with check (user_id = auth.uid());
create policy "favorites: 본인 삭제" on favorites for delete using (user_id = auth.uid());

-- comments: 참여자만 조회, 본인만 insert/delete
create policy "comments: 참여자 조회" on comments for select
  using (exists (
    select 1 from options o
    join box_participants bp on bp.box_id = o.box_id
    where o.id = comments.option_id and bp.user_id = auth.uid()
  ));

create policy "comments: 본인 insert" on comments for insert
  with check (user_id = auth.uid());

create policy "comments: 본인 삭제" on comments for delete
  using (user_id = auth.uid());

-- withdraw_reasons: insert만 (수집 후 조회 불가)
create policy "withdraw_reasons: insert" on withdraw_reasons for insert
  with check (true);
