-- 043: 직접 초대 시 'participant_joined' 브로드캐스트 억제.
--   문제: invite_users_to_box(과거 함께한 사람 골라 바로 추가)가 box_participants에 INSERT하면
--         log_participant_activity 트리거가 participant_joined(공용, 브로드캐스트)를 남겨서,
--         초대자·기존 멤버 모두 "○○님이 들어왔어요"를 봄. 직접 초대는 이미 'invited' 타겟 알림
--         (초대당사자만)을 따로 남기므로, 이 브로드캐스트는 불필요한 노이즈.
--   원하는 동작:
--     · 직접 초대   → 'invited' 타겟 알림만(초대당사자). participant_joined 없음.
--     · 링크 참여   → participant_joined 그대로(기존 멤버가 "누가 들어왔어요"를 봄).
--     · 신청 승인   → participant_joined 그대로(기존 멤버가 새 참여자를 봄) + 'join_approved' 타겟.
--   구분: 초대·승인 모두 actor(auth.uid) ≠ 새 참여자라 단순 비교로는 못 가른다.
--         → invite RPC가 트랜잭션-로컬 플래그(pickstash.via_invite)를 세팅하고, 트리거가 그 플래그면 건너뛴다.
--         이 플래그는 invite RPC 호출 트랜잭션 안에서만 유효(set_config is_local=true)라 다른 경로엔 영향 없음.
-- 재실행 안전(create or replace).

create or replace function log_participant_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- 상자 생성자(첫 참여자) 자동 등록은 제외(count=1).
  -- 직접 초대(via_invite 플래그)도 제외 — invite RPC가 'invited' 타겟 알림을 따로 남긴다.
  if (select count(*) from box_participants where box_id = new.box_id) > 1
     and coalesce(current_setting('pickstash.via_invite', true), '') <> 'on' then
    insert into box_activities (box_id, actor_id, type)
    values (new.box_id, new.user_id, 'participant_joined');
  end if;
  return new;
end; $$;

create or replace function public.invite_users_to_box(p_box_id uuid, p_user_ids uuid[])
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception 'not a participant of this box';
  end if;
  -- 이 트랜잭션의 participant_joined 트리거를 억제(직접 초대는 invited 타겟 알림만).
  perform set_config('pickstash.via_invite', 'on', true);
  with ins as (
    insert into box_participants (box_id, user_id)
    select p_box_id, uid from unnest(p_user_ids) as uid
    on conflict (box_id, user_id) do nothing
    returning user_id
  )
  insert into box_activities (box_id, actor_id, type, target_user_id)
  select p_box_id, auth.uid(), 'invited', user_id from ins;
end; $$;
