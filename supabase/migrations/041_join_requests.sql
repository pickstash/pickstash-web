-- 041_join_requests.sql — 공개 상자 참여 신청 → 참여자 승인 (팔로우와 별개)
-- 개편 M2. 추가전용(신규 테이블 + 활동 타입 2종). 재실행 안전.
-- 현재 참여는 "insert = 즉시 정회원"뿐 → 외부인이 pending 신청, 참여자가 승인해야 합류하는 경로 신설.

-- 1) 신청 테이블 (상자×유저 1건)
create table if not exists join_requests (
  box_id uuid not null references boxes(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references profiles(id) on delete set null,
  primary key (box_id, user_id)
);
create index if not exists join_requests_box_idx on join_requests (box_id) where status = 'pending';

alter table join_requests enable row level security;

-- SELECT: 신청자 본인 + 그 상자 참여자(승인 판단). 쓰기는 아래 definer RPC로만.
drop policy if exists join_requests_select on join_requests;
create policy join_requests_select on join_requests for select using (
  user_id = auth.uid()
  or exists (select 1 from box_participants bp where bp.box_id = join_requests.box_id and bp.user_id = auth.uid())
);

-- 2) box_activities 타입 확장 (join_requested·join_approved 추가). 035 목록 + 2종.
alter table public.box_activities drop constraint if exists box_activities_type_check;
alter table public.box_activities add constraint box_activities_type_check
  check (type = any (array[
    'option_added', 'vote_cast', 'comment_added',
    'box_closed', 'box_closed_auto',
    'box_reopened', 'rematch_started', 'deadline_changed',
    'participant_joined', 'invited',
    'join_requested', 'join_approved'
  ]));

-- 3) 참여 신청 — 공개 상자 + 미참여 + 중복 아님. 참여자들에게 활동 알림.
create or replace function request_to_join(p_box_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '로그인이 필요해요'; end if;
  if not exists (select 1 from boxes where id = p_box_id and visibility = 'public') then
    raise exception '공개된 상자만 신청할 수 있어요';
  end if;
  if exists (select 1 from box_participants where box_id = p_box_id and user_id = v_uid) then
    raise exception '이미 참여 중이에요';
  end if;
  insert into join_requests (box_id, user_id, status)
    values (p_box_id, v_uid, 'pending')
    on conflict (box_id, user_id) do update set status = 'pending', created_at = now(), decided_at = null, decided_by = null;
  -- 참여자 전원에게(타겟 없음) 신청 활동. actor=신청자.
  insert into box_activities (box_id, actor_id, type, meta)
    values (p_box_id, v_uid, 'join_requested', '{}');
end;
$$;
grant execute on function request_to_join(uuid) to authenticated;

-- 4) 신청 응답(승인/거절) — 그 상자 참여자만. 승인 시 참여자 추가 + 신청자에게 타겟 알림.
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
  if p_approve then
    insert into box_participants (box_id, user_id) values (p_box_id, p_user_id)
      on conflict (box_id, user_id) do nothing;
    -- 신청자에게만(타겟) 승인 알림. actor=승인자.
    insert into box_activities (box_id, actor_id, type, target_user_id, meta)
      values (p_box_id, v_uid, 'join_approved', p_user_id, '{}');
  end if;
end;
$$;
grant execute on function respond_join_request(uuid, uuid, boolean) to authenticated;
