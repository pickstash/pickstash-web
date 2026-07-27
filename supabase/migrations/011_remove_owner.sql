-- 011_remove_owner.sql — '방장(owner)' 개념 제거
-- boxes.owner_id, box_participants.role 컬럼 삭제 + 이를 참조하던 정책·함수 재작성.
-- 배경: 008로 방장 특권은 이미 전면 폐기됨(참여자면 누구나). 트리플처럼 "만든 사람도
--       나가기만, 마지막 1명이 나가면 자동 삭제" 모델 확정 → owner/role은 껍데기라 제거.
-- 그룹(groups.owner_id)은 별개 기능이라 유지.
-- ⚠️ 라이브 DB: 컬럼 삭제 포함. 코드 push 전에 대시보드에서 먼저 적용. 재실행 안전(idempotent).

-- ① 참여 활동 로그: 기존엔 role='owner'(생성자 자동등록)를 로그에서 제외했음.
--    role 제거 → '첫 참여자(=생성자)'는 로그 남기지 않는 방식으로 변경.
create or replace function log_participant_activity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- 상자 생성자(첫 참여자)의 자동 등록은 활동으로 남기지 않는다.
  if (select count(*) from box_participants where box_id = new.box_id) > 1 then
    insert into box_activities (box_id, actor_id, type)
    values (new.box_id, new.user_id, 'participant_joined');
  end if;
  return new;
end; $$;

-- ② 마감 자동결정 actor 폴백: owner_id → 첫 참여자(생성자)
create or replace function auto_decide_box(p_box_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_max int; v_actor uuid;
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

  v_actor := coalesce(
    auth.uid(),
    (select user_id from box_participants where box_id = p_box_id order by joined_at limit 1)
  );
  if v_actor is not null then
    insert into box_activities (box_id, actor_id, type) values (p_box_id, v_actor, 'box_closed');
  end if;
end; $$;

-- ③ 초대 미리보기 RPC: owner_nickname(방장 닉네임) 컬럼 제거.
--    (반환 시그니처 변경이라 drop 후 재생성)
drop function if exists get_box_preview_by_invite_code(text);
create function get_box_preview_by_invite_code(p_code text)
returns table (
  id uuid,
  title text,
  memo text,
  participant_count bigint,
  option_names text[]
)
language sql security definer set search_path = public stable as $$
  select b.id,
         b.title,
         b.memo,
         (select count(*) from box_participants bp where bp.box_id = b.id) as participant_count,
         coalesce(
           (select array_agg(o.name order by o.created_at) from options o where o.box_id = b.id),
           '{}'
         ) as option_names
  from boxes b
  where b.invite_code = p_code;
$$;

-- ④ 죽은 close_box(uuid) 제거 — role='owner'를 참조. 007 decide_box로 이미 대체됨.
drop function if exists close_box(uuid);

-- ⑤ boxes RLS 정책을 owner_id 없는 정의로 전면 재작성.
--    (라이브에서 SELECT 정책 등이 owner_id를 참조하도록 드리프트돼 있어, 컬럼 삭제를 막음.
--     drop-blocking 의존을 없애려고 SELECT·INSERT·UPDATE를 모두 새로 만들고 DELETE는 폐기.)
drop policy if exists "boxes: 참여자 조회" on boxes;
create policy "boxes: 참여자 조회" on boxes for select
  using (exists (select 1 from box_participants where box_id = boxes.id and user_id = auth.uid()));

drop policy if exists "boxes: 인증 유저 생성" on boxes;
create policy "boxes: 인증 유저 생성" on boxes for insert
  with check (auth.uid() is not null);

drop policy if exists "boxes: owner 수정" on boxes;
drop policy if exists "boxes: 참여자 수정" on boxes;
create policy "boxes: 참여자 수정" on boxes for update
  using (exists (select 1 from box_participants where box_id = boxes.id and user_id = auth.uid()));

--    DELETE: 'owner 삭제' 폐기 — 삭제는 delete_box_when_empty 트리거(비면 자동)만 담당, 직접 삭제 없음
drop policy if exists "boxes: owner 삭제" on boxes;

-- ⑥ 컬럼 삭제 (위에서 의존 객체를 모두 제거/재작성한 뒤)
alter table boxes            drop column if exists owner_id;
alter table box_participants drop column if exists role;
