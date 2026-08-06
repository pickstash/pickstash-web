-- 029: 서랍에 '함께했던 사람' 바로 초대 (invite_users_to_box의 서랍 판). 재실행 안전.
-- 서랍 멤버만 호출 가능. folder_members에 추가하면 trg_folder_member_added가 그 서랍 상자들 참여까지 처리.
create or replace function public.invite_users_to_folder(p_folder_id uuid, p_user_ids uuid[])
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from folder_members where folder_id = p_folder_id and user_id = auth.uid()) then
    raise exception 'not a member of this folder';
  end if;
  insert into folder_members (folder_id, user_id)
  select p_folder_id, uid from unnest(p_user_ids) as uid
  on conflict (folder_id, user_id) do nothing;
end; $$;

grant execute on function public.invite_users_to_folder(uuid, uuid[]) to authenticated;
