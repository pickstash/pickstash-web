-- 028: 부분 초대 — 특정 사람(들)을 상자 참여자로 바로 추가 (그때그때 초대, 범위 ②)
-- box_participants INSERT 정책은 본인만(user_id=auth.uid())이라 남을 못 넣는다.
-- 호출자가 그 상자 참여자면 지정한 유저들을 참여자로 추가하는 security definer RPC.
-- 추가 시 log_participant_activity 트리거가 participant_joined 활동을 남긴다(멱등: on conflict do nothing).
-- 재실행 안전(create or replace).

create or replace function public.invite_users_to_box(p_box_id uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- 초대는 그 상자 참여자만 할 수 있다(무단 추가 방지).
  if not exists (
    select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()
  ) then
    raise exception 'not a participant of this box';
  end if;

  insert into box_participants (box_id, user_id)
  select p_box_id, uid from unnest(p_user_ids) as uid
  on conflict (box_id, user_id) do nothing;
end;
$$;
