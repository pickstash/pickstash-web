-- 054_join_rejected_alert.sql — 참여 '거절' 알림이 신청자 알림함에 뜨게.
--   신청자는 거절되면 그 상자 멤버가 아니라서 (1) box_activities SELECT RLS(참여자만)에 막히고
--   (2) getAlerts가 '내가 참여한 상자'만 조회해 못 가져온다. RLS를 '내가 타겟인 알림'까지 열고,
--   RPC가 meta에 상자 제목을 담아 신청자가 상자를 못 읽어도 제목이 보이게 한다.
-- 재실행 안전(drop policy if exists / create or replace). 코드 배포 전 대시보드에서 먼저 실행.

-- 1) box_activities SELECT: 참여자 + '내가 타겟인 알림'(거절 등)도 읽는다.
drop policy if exists "box_activities: 참여자 조회" on box_activities;
create policy "box_activities: 참여자 조회" on box_activities for select using (
  exists (select 1 from box_participants bp where bp.box_id = box_activities.box_id and bp.user_id = auth.uid())
  or target_user_id = auth.uid()
);

-- 2) respond_join_request: 거절/수락 알림 meta에 상자 제목 저장(신청자 표시용). 나머지는 046과 동일.
create or replace function respond_join_request(p_box_id uuid, p_user_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_title text;
begin
  if v_uid is null then raise exception '로그인이 필요해요'; end if;
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = v_uid) then
    raise exception '참여자만 승인할 수 있어요';
  end if;
  update join_requests
    set status = case when p_approve then 'approved' else 'rejected' end,
        decided_at = now(), decided_by = v_uid
    where box_id = p_box_id and user_id = p_user_id and status = 'pending';
  if not found then raise exception '처리할 신청이 없어요'; end if;

  select title into v_title from boxes where id = p_box_id;

  if p_approve then
    insert into box_participants (box_id, user_id) values (p_box_id, p_user_id)
      on conflict (box_id, user_id) do nothing;
    -- 신청자에게만(타겟) 수락 알림.
    insert into box_activities (box_id, actor_id, type, target_user_id, meta)
      values (p_box_id, v_uid, 'join_approved', p_user_id, jsonb_build_object('box_title', v_title));
  else
    -- 신청자에게만(타겟) 거절 알림. 푸시는 보내지 않음(알림함만).
    insert into box_activities (box_id, actor_id, type, target_user_id, meta)
      values (p_box_id, v_uid, 'join_rejected', p_user_id, jsonb_build_object('box_title', v_title));
  end if;
end; $$;

grant execute on function respond_join_request(uuid, uuid, boolean) to authenticated;
