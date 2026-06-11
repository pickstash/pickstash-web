-- 비참여자가 초대 랜딩에서 상자 이름만 조회 (RLS 우회, 제한적 노출)
create or replace function get_box_by_invite_code(p_code text)
returns table (id uuid, title text) as $$
  select id, title from boxes where invite_code = p_code;
$$ language sql security definer;

-- 초대 수락: 현재 로그인 유저를 참여자로 등록
create or replace function join_box_by_invite_code(p_code text)
returns uuid as $$
declare v_box_id uuid;
begin
  select id into v_box_id from boxes where invite_code = p_code;
  insert into box_participants (box_id, user_id)
  values (v_box_id, auth.uid())
  on conflict do nothing;
  return v_box_id;
end;
$$ language plpgsql security definer;

-- 그룹 전원을 상자 참여자로 초대 (트랜잭션)
create or replace function invite_group_to_box(p_box_id uuid, p_group_id uuid)
returns void as $$
begin
  insert into box_participants (box_id, user_id)
  select p_box_id, user_id from group_members where group_id = p_group_id
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- 프로필 자동 생성 트리거 함수
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1),
      'user'
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- auth.users insert 시 프로필 자동 생성
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
