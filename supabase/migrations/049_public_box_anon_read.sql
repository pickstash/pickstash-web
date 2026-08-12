-- 049_public_box_anon_read.sql — 둘러보기/프로필의 공개 상자를 /p/[id](별도 요약 컴포넌트) 대신
--   진짜 /box/[id] + BoxDetailClient로 읽게 한다(비로그인 포함) — 4곳 읽기전용 화면 레이아웃 통일.
-- can_read_box(048)에 '공개 상자(visibility=public)'면 누구나(anon 포함) 읽기 가능 조건을 추가한다.
--
-- ⚠️ 보안: join_box(048, 승인 없이 즉시 참여)는 '서랍으로 접근 가능'할 때만 맞는 동작이다(이미 아는
--   사람들 사이). can_read_box가 공개 상자까지 포함하도록 넓어지므로, join_box의 게이트를 그대로
--   두면 둘러보기에서 발견한 아무 공개 상자에나 승인 없이 즉시 참여할 수 있게 되는 회귀가 생긴다.
--   그래서 '드로어 접근'만 따로 떼어낸 can_join_box_instantly를 신설해 join_box가 이걸 쓰게 바꾼다.
--   공개 상자 발견자는 기존 041 request_to_join(승인제)을 그대로 쓴다(이번 마이그레이션은 안 건드림).
--
-- 재실행 안전(create or replace + grant는 멱등).

-- 1) can_read_box 재정의 — 참여자 OR 드로어 접근 OR 공개 상자.
create or replace function public.can_read_box(p_box_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from boxes b where b.id = p_box_id and b.visibility = 'public')
    or public.is_box_participant(p_box_id)
    or exists (
      select 1 from box_folders bf
      join folder_members fm on fm.folder_id = bf.folder_id and fm.user_id = auth.uid()
      where bf.box_id = p_box_id and (bf.added_by = auth.uid() or bf.shared)
    );
$$;

-- 2) can_join_box_instantly — can_read_box의 '드로어' 절만 분리(공개 여부·참여 여부는 안 봄).
--    join_box(048)가 이걸로 게이트를 바꾼다 — 공개 상자만으로는 즉시 참여 불가.
create or replace function public.can_join_box_instantly(p_box_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from box_folders bf
    join folder_members fm on fm.folder_id = bf.folder_id and fm.user_id = auth.uid()
    where bf.box_id = p_box_id and (bf.added_by = auth.uid() or bf.shared)
  );
$$;

create or replace function public.join_box(p_box_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '로그인이 필요해요'; end if;
  if exists (select 1 from box_participants where box_id = p_box_id and user_id = v_uid) then return; end if;
  if not public.can_join_box_instantly(p_box_id) then raise exception '접근할 수 없는 상자예요'; end if;
  insert into box_participants (box_id, user_id) values (p_box_id, v_uid);
  insert into box_activities (box_id, actor_id, type) values (p_box_id, v_uid, 'participant_joined');
end;
$$;

-- 3) 실행 권한 — anon도 읽기 판정 함수는 호출 가능해야 함(비로그인 공개 상자 열람).
--    join_box·can_join_box_instantly는 authenticated만(비로그인은 애초에 auth.uid() null이라 무의미).
grant execute on function public.can_read_box(uuid) to anon, authenticated;
grant execute on function public.is_box_participant(uuid) to anon, authenticated;
grant execute on function public.can_join_box_instantly(uuid) to authenticated;
grant execute on function public.join_box(uuid) to authenticated;

-- 4) 테이블 SELECT 권한 — Supabase 프로젝트 기본 설정상 이미 anon에 부여돼 있을 가능성이 높지만,
--    RLS가 실제 접근을 가르므로 방어적으로 명시(멱등, 위험 없음).
grant select on boxes, options, votes, comments, comment_likes, box_participants to anon;
