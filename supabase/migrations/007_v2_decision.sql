-- 007_v2_decision.sql
-- v2 결정 모델 (2026-07-24). spec.md §3/§5/§6 v2 기준.
--   · 상태 2종(정리중=closed_at null / 정리완료=closed_at 있음)
--   · 결정 방식 상자마다 선택: boxes.decision_mode ('manual' 직접 정하기 / 'auto_deadline' 마감 투표)
--   · 결정 = 선택지 decided_at 표시(중복 가능) + closed_at. 참여자 누구나 가능. 번복 가능.
--   · 편집 잠금 없음(정리완료여도 편집 허용) — "정리된 상자 쓰기 가드" RLS 폐기.
--   · 재투표(끝장전)·시간만료 자동상태·라운드 폐기.
-- ⚠️ 라이브 DB: 적용 전 boxes/options 백업 권장. 코드 push 전에 대시보드에서 먼저 적용.
-- 전부 idempotent(재실행 안전).

-- ─────────────────────────────────────────────
-- ① 스키마: 결정 방식 + 결정 표시
-- ─────────────────────────────────────────────
alter table boxes  add column if not exists decision_mode text not null default 'manual';
alter table boxes  drop constraint if exists boxes_decision_mode_chk;
alter table boxes  add  constraint boxes_decision_mode_chk check (decision_mode in ('manual', 'auto_deadline'));

alter table options add column if not exists decided_at timestamptz;  -- null=미결정, 값=결정된 선택지

-- ─────────────────────────────────────────────
-- ② RPC: 재투표 삭제 + 결정/번복/자동결정 (참여자 누구나)
-- ─────────────────────────────────────────────
drop function if exists start_rematch(uuid, timestamptz);   -- 재투표 폐기
drop function if exists reopen_box(uuid, timestamptz);      -- 구 2-인자 reopen 제거(아래 1-인자로 대체)

-- 결정: 선택한 옵션(들)을 결정 표시 + 정리완료. 중복 결정 가능, 나머지는 결정 해제.
create or replace function decide_box(p_box_id uuid, p_option_ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception 'not_participant';
  end if;
  update options set decided_at = now()  where box_id = p_box_id and id = any(p_option_ids);
  update options set decided_at = null   where box_id = p_box_id and not (id = any(p_option_ids));
  update boxes   set closed_at  = now()  where id = p_box_id;
  insert into box_activities (box_id, actor_id, type) values (p_box_id, auth.uid(), 'box_closed');
end; $$;

-- 번복(다시 정리하기): 정리완료 해제 + 결정 표시 전부 해제 → 정리중 복귀
create or replace function reopen_box(p_box_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception 'not_participant';
  end if;
  update boxes   set closed_at  = null where id = p_box_id;
  update options set decided_at = null where box_id = p_box_id and decided_at is not null;
  insert into box_activities (box_id, actor_id, type) values (p_box_id, auth.uid(), 'box_reopened');
end; $$;

-- 마감 투표 자동 결정 (lazy commit 용): auto_deadline + 마감경과 + 미결일 때 좋아요 최다(들)를 결정.
-- 좋아요/선택지 신호가 없으면 결정하지 않고 그대로 둔다(정리중 유지 → 코드에서 직접 정하기로 폴백).
create or replace function auto_decide_box(p_box_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_max int;
begin
  if not exists (
    select 1 from boxes where id = p_box_id
      and decision_mode = 'auto_deadline' and closed_at is null
      and deadline_at is not null and deadline_at <= now()
  ) then return; end if;

  select max(cnt) into v_max from (
    select count(*) cnt from votes v join options o on o.id = v.option_id
    where o.box_id = p_box_id and v.vote_type = 'like' group by v.option_id
  ) t;
  if v_max is null or v_max = 0 then return; end if;  -- 선택지/좋아요 없음 → 폴백(정리중 유지)

  update options set decided_at = now()
  where box_id = p_box_id and id in (
    select o.id from options o join votes v on v.option_id = o.id and v.vote_type = 'like'
    where o.box_id = p_box_id group by o.id having count(*) = v_max
  );
  update boxes set closed_at = now() where id = p_box_id;
  -- actor 폴백: owner_id 삭제(011) → 첫 참여자(생성자). owner_id 참조하면 재실행 시 실패.
  insert into box_activities (box_id, actor_id, type)
  values (p_box_id, coalesce(auth.uid(), (select user_id from box_participants where box_id = p_box_id order by joined_at limit 1)), 'box_closed');
end; $$;

-- ─────────────────────────────────────────────
-- ③ RLS: "정리된 상자 쓰기 가드" 폐기 — 정리완료 상자에서도 좋아요·선택지 편집 허용 (spec §3-4)
--    (기존 004 정책에서 box_is_open() 조건만 제거, 참여자/작성자/owner 체크는 유지)
-- ─────────────────────────────────────────────
drop policy if exists "votes: 본인 insert" on votes;
create policy "votes: 본인 insert" on votes for insert with check (user_id = auth.uid());
drop policy if exists "votes: 본인 update" on votes;
create policy "votes: 본인 update" on votes for update using (user_id = auth.uid());
drop policy if exists "votes: 본인 delete" on votes;
create policy "votes: 본인 delete" on votes for delete using (user_id = auth.uid());

drop policy if exists "options: 참여자 추가" on options;
create policy "options: 참여자 추가" on options for insert with check (
  created_by = auth.uid()
  and exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid())
);
-- 수정/삭제: 참여자 누구나(008에서 방장/작성자 구분 폐기, 011에서 role 컬럼 삭제).
--   role 컬럼을 참조하면 011 이후 재실행 시 "column role does not exist"로 실패하므로 참여자 기준으로 통일.
drop policy if exists "options: 작성자·owner 수정" on options;
drop policy if exists "options: 참여자 수정" on options;
create policy "options: 참여자 수정" on options for update
  using (exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid()));
drop policy if exists "options: 작성자·owner 삭제" on options;
drop policy if exists "options: 참여자 삭제" on options;
create policy "options: 참여자 삭제" on options for delete
  using (exists (select 1 from box_participants where box_id = options.box_id and user_id = auth.uid()));

-- ─────────────────────────────────────────────
-- ④ 백필: 기존 정리완료 상자에 결정 표시가 하나도 없으면 좋아요 최다(들)를 결정으로.
--    (이미 결정 표시가 있는 상자는 건너뜀 → 재실행 안전)
-- ─────────────────────────────────────────────
update options o set decided_at = b.closed_at
from boxes b
where o.box_id = b.id and b.closed_at is not null
  and not exists (select 1 from options o2 where o2.box_id = b.id and o2.decided_at is not null)
  and o.id in (
    select oo.id from options oo join votes v on v.option_id = oo.id and v.vote_type = 'like'
    where oo.box_id = b.id group by oo.id
    having count(*) = (
      select max(cnt) from (
        select count(*) cnt from votes v2 join options o3 on o3.id = v2.option_id
        where o3.box_id = b.id and v2.vote_type = 'like' group by v2.option_id
      ) t
    )
  );

-- 참고(남겨둠, 무해): boxes.current_round·votes.round·close_box(uuid)·box_is_open()·deadline_changed 트리거.
--   decision_mode='manual' 상자는 deadline_at을 무시한다(코드에서 처리). current_round 드롭은 선택.
