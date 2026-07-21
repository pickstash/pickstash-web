-- 004_replan.sql — 2026-07 기획 v1 리뉴얼 (spec.md 5·6장 참조)
-- ① 마감 없는 상자 허용  ② box_activities 활동 로그 + 트리거 일원화
-- ③ 정리된 상자 쓰기 가드(RLS)  ④ close/reopen/rematch RPC  ⑤ 초대 랜딩 미리보기 RPC
--
-- ※ 여러 번 실행해도 안전(idempotent)하도록 모든 객체에 if exists / if not exists / or replace 가드.
--   부분 실행 후 재실행해도 에러 없이 끝까지 완료된다.

-- ─────────────────────────────────────────────
-- ① 마감 없는 상자 (혼자 모드): deadline_at nullable
-- ─────────────────────────────────────────────
alter table boxes alter column deadline_at drop not null;

-- ─────────────────────────────────────────────
-- ② 상자 활동 로그
-- ─────────────────────────────────────────────
create table if not exists box_activities (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references boxes(id) on delete cascade,
  actor_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in (
    'option_added', 'vote_cast', 'comment_added',
    'box_closed', 'box_reopened', 'rematch_started',
    'deadline_changed', 'participant_joined'
  )),
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists box_activities_box_created_idx on box_activities (box_id, created_at desc);

alter table box_activities enable row level security;

drop policy if exists "box_activities: 참여자 조회" on box_activities;
create policy "box_activities: 참여자 조회" on box_activities for select
  using (exists (select 1 from box_participants where box_id = box_activities.box_id and user_id = auth.uid()));
-- insert 정책 없음: 기록은 아래 트리거(security definer)로만 수행

-- 활동이 쌓이면 상자가 들썩인다: box_activities insert → boxes.updated_at 갱신
create or replace function touch_box_on_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update boxes set updated_at = new.created_at where id = new.box_id;
  return new;
end; $$;

drop trigger if exists trg_touch_box_on_activity on box_activities;
create trigger trg_touch_box_on_activity
  after insert on box_activities
  for each row execute function touch_box_on_activity();

-- 선택지 추가 → 활동 기록
create or replace function log_option_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into box_activities (box_id, actor_id, type, meta)
  values (new.box_id, new.created_by, 'option_added', jsonb_build_object('option_name', new.name));
  return new;
end; $$;

drop trigger if exists trg_log_option_activity on options;
create trigger trg_log_option_activity
  after insert on options
  for each row execute function log_option_activity();

-- 투표(생성·변경) → 활동 기록. 토글 취소(delete)는 기록하지 않는다
create or replace function log_vote_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_box_id uuid; v_option_name text;
begin
  select box_id, name into v_box_id, v_option_name from options where id = new.option_id;
  insert into box_activities (box_id, actor_id, type, meta)
  values (v_box_id, new.user_id, 'vote_cast',
          jsonb_build_object('option_name', v_option_name, 'vote_type', new.vote_type));
  return new;
end; $$;

drop trigger if exists trg_log_vote_activity on votes;
create trigger trg_log_vote_activity
  after insert or update on votes
  for each row execute function log_vote_activity();

-- 댓글 → 활동 기록
create or replace function log_comment_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_box_id uuid; v_option_name text;
begin
  select box_id, name into v_box_id, v_option_name from options where id = new.option_id;
  insert into box_activities (box_id, actor_id, type, meta)
  values (v_box_id, new.user_id, 'comment_added', jsonb_build_object('option_name', v_option_name));
  return new;
end; $$;

drop trigger if exists trg_log_comment_activity on comments;
create trigger trg_log_comment_activity
  after insert on comments
  for each row execute function log_comment_activity();

-- 참여자 합류 → 활동 기록 (상자 생성 시 owner 자동 등록은 제외)
create or replace function log_participant_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role <> 'owner' then
    insert into box_activities (box_id, actor_id, type)
    values (new.box_id, new.user_id, 'participant_joined');
  end if;
  return new;
end; $$;

drop trigger if exists trg_log_participant_activity on box_participants;
create trigger trg_log_participant_activity
  after insert on box_participants
  for each row execute function log_participant_activity();

-- 마감 기한 변경 → 활동 기록 (reopen/rematch RPC의 갱신은 자체 활동을 남기므로 제외)
create or replace function log_deadline_change_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deadline_at is distinct from old.deadline_at
     and new.closed_at is not distinct from old.closed_at
     and new.current_round = old.current_round
     and auth.uid() is not null then
    insert into box_activities (box_id, actor_id, type)
    values (new.id, auth.uid(), 'deadline_changed');
  end if;
  return new;
end; $$;

drop trigger if exists trg_log_deadline_change_activity on boxes;
create trigger trg_log_deadline_change_activity
  after update on boxes
  for each row execute function log_deadline_change_activity();

-- ─────────────────────────────────────────────
-- ③ 정리된 상자 쓰기 가드 (RLS 재정의)
--    종결 상자(closed 또는 마감 경과)에서는 투표·선택지 쓰기를 서버에서 거부.
--    댓글은 종결 상자에서도 허용 (spec 5장 RLS 방침)
-- ─────────────────────────────────────────────
create or replace function box_is_open(p_box_id uuid) returns boolean
language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from boxes
    where id = p_box_id
      and closed_at is null
      and (deadline_at is null or deadline_at > now())
  );
$$;

drop policy if exists "votes: 본인 insert" on votes;
create policy "votes: 본인 insert" on votes for insert
  with check (
    user_id = auth.uid()
    and box_is_open((select box_id from options where id = option_id))
  );

drop policy if exists "votes: 본인 update" on votes;
create policy "votes: 본인 update" on votes for update
  using (
    user_id = auth.uid()
    and box_is_open((select box_id from options where id = option_id))
  );

drop policy if exists "votes: 본인 delete" on votes;
create policy "votes: 본인 delete" on votes for delete
  using (
    user_id = auth.uid()
    and box_is_open((select box_id from options where id = option_id))
  );

drop policy if exists "options: 참여자 추가" on options;
create policy "options: 참여자 추가" on options for insert
  with check (
    created_by = auth.uid()
    and exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid())
    and box_is_open(options.box_id)
  );

drop policy if exists "options: 작성자·owner 수정" on options;
create policy "options: 작성자·owner 수정" on options for update
  using (
    (created_by = auth.uid()
     or exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid() and role = 'owner'))
    and box_is_open(options.box_id)
  );

drop policy if exists "options: 작성자·owner 삭제" on options;
create policy "options: 작성자·owner 삭제" on options for delete
  using (
    (created_by = auth.uid()
     or exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid() and role = 'owner'))
    and box_is_open(options.box_id)
  );

-- ─────────────────────────────────────────────
-- ④ 종결·재오픈·재투표 RPC (owner 검증 + 활동 기록)
-- ─────────────────────────────────────────────

-- 이대로 결정하기
create or replace function close_box(p_box_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from box_participants
                 where box_id = p_box_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'not_owner';
  end if;
  update boxes set closed_at = now() where id = p_box_id and closed_at is null;
  insert into box_activities (box_id, actor_id, type) values (p_box_id, auth.uid(), 'box_closed');
end; $$;

-- 다시 정리하기. 마감이 이미 지난 상자는 새 마감(p_deadline) 필수, 미래 시각 검증
create or replace function reopen_box(p_box_id uuid, p_deadline timestamptz default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_deadline timestamptz;
begin
  if not exists (select 1 from box_participants
                 where box_id = p_box_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'not_owner';
  end if;
  select deadline_at into v_deadline from boxes where id = p_box_id;
  if p_deadline is not null and p_deadline <= now() then
    raise exception 'deadline_in_past';
  end if;
  if p_deadline is null and v_deadline is not null and v_deadline <= now() then
    raise exception 'deadline_required';
  end if;
  update boxes
  set closed_at = null,
      deadline_at = coalesce(p_deadline, deadline_at)
  where id = p_box_id;
  insert into box_activities (box_id, actor_id, type) values (p_box_id, auth.uid(), 'box_reopened');
end; $$;

-- 재투표 시작 (구 끝장전의 단순화판): 새 라운드 + 새 마감
create or replace function start_rematch(p_box_id uuid, p_deadline timestamptz) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from box_participants
                 where box_id = p_box_id and user_id = auth.uid() and role = 'owner') then
    raise exception 'not_owner';
  end if;
  if p_deadline is null or p_deadline <= now() then
    raise exception 'deadline_in_past';
  end if;
  update boxes
  set current_round = current_round + 1,
      deadline_at = p_deadline,
      closed_at = null
  where id = p_box_id;
  insert into box_activities (box_id, actor_id, type) values (p_box_id, auth.uid(), 'rematch_started');
end; $$;

-- ─────────────────────────────────────────────
-- ⑤ 초대 랜딩 미리보기 (비로그인·비참여자용, 제한적 노출)
-- ─────────────────────────────────────────────
create or replace function get_box_preview_by_invite_code(p_code text)
returns table (
  id uuid,
  title text,
  memo text,
  owner_nickname text,
  participant_count bigint,
  option_names text[]
)
language sql security definer set search_path = public stable as $$
  select b.id,
         b.title,
         b.memo,
         p.nickname as owner_nickname,
         (select count(*) from box_participants bp where bp.box_id = b.id) as participant_count,
         coalesce(
           (select array_agg(o.name order by o.created_at) from options o where o.box_id = b.id),
           '{}'
         ) as option_names
  from boxes b
  join profiles p on p.id = b.owner_id
  where b.invite_code = p_code;
$$;
