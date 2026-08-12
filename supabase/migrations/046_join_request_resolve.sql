-- 046: 참여 신청 거절 알림 + 처리 결과 추적.
--   ① 거절해도 신청자에게 아무 알림이 안 감 → 거절 시 신청자에게 타겟 알림(join_rejected). 푸시 없이 알림함만.
--   ② 처리 상태는 join_requests.status(pending/approved/rejected)로 추적한다.
--      알림함은 join_requested 활동 + 그 신청 상태를 조인해, pending이면 [수락][거절] 버튼을,
--      처리됐으면 "수락/거절했어요" 기록을 보여준다(알림 항목은 삭제하지 않고 상태만 바뀜).
--      홈 들썩임은 status<>'pending'인 신청 활동을 제외해 잔상을 없앤다(앱 쿼리에서 필터).
-- 재실행 안전(drop constraint if exists / create or replace).

-- ① join_rejected 타입 허용 (041 목록 + join_rejected)
alter table public.box_activities drop constraint if exists box_activities_type_check;
alter table public.box_activities add constraint box_activities_type_check
  check (type = any (array[
    'option_added', 'vote_cast', 'comment_added',
    'box_closed', 'box_closed_auto',
    'box_reopened', 'rematch_started', 'deadline_changed',
    'participant_joined', 'invited',
    'join_requested', 'join_approved', 'join_rejected'
  ]));

-- ② 응답 RPC: 신청 활동 정리 + 거절 시 신청자 타겟 알림
create or replace function respond_join_request(p_box_id uuid, p_user_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
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

  -- join_requested 활동은 남겨둔다(알림함이 status와 조인해 '수락/거절했어요' 기록으로 표시).
  if p_approve then
    insert into box_participants (box_id, user_id) values (p_box_id, p_user_id)
      on conflict (box_id, user_id) do nothing;
    -- 신청자에게만(타겟) 승인 알림. actor=승인자.
    insert into box_activities (box_id, actor_id, type, target_user_id, meta)
      values (p_box_id, v_uid, 'join_approved', p_user_id, '{}');
  else
    -- 신청자에게만(타겟) 거절 알림. actor=거절자. 푸시는 보내지 않음(알림함만).
    insert into box_activities (box_id, actor_id, type, target_user_id, meta)
      values (p_box_id, v_uid, 'join_rejected', p_user_id, '{}');
  end if;
end; $$;
grant execute on function respond_join_request(uuid, uuid, boolean) to authenticated;
