-- 031: 알림함 타겟 알림 — 초대(invited)·멘션(mentioned)이 푸시만 오고 알림함엔 안 남던 문제.
--  · target_user_id: 있으면 그 사람만 보는 알림(초대). null이면 상자 전체 공용(기존 활동 전부).
--  · 멘션은 새 타입 없이 comment_added.meta.mentioned_ids로 심고, 알림함이 그 사람에게 '언급' 문구로 리라벨.
-- 재실행 안전(add column if not exists / drop constraint if exists / create or replace).

-- ① 타겟 대상 컬럼
alter table public.box_activities
  add column if not exists target_user_id uuid references public.profiles(id) on delete cascade;

-- ② 'invited' 타입 허용 (기존 8종 + invited)
alter table public.box_activities drop constraint if exists box_activities_type_check;
alter table public.box_activities add constraint box_activities_type_check
  check (type in (
    'option_added','vote_cast','comment_added','box_closed','box_reopened',
    'rematch_started','deadline_changed','participant_joined','invited'
  ));

-- ③ 댓글 활동에 멘션된 user id 배열을 meta에 심는다(본문 @[닉](uuid) 토큰 파싱).
--    option_id(딥링크)는 그대로 보존. mentioned_ids 없으면 meta에 안 넣음.
create or replace function log_comment_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_box_id uuid; v_option_name text; v_mentioned uuid[];
begin
  select box_id, name into v_box_id, v_option_name from options where id = new.option_id;
  select array_agg(distinct (m[1])::uuid) into v_mentioned
    from regexp_matches(new.body, '@\[[^\]]+\]\(([0-9a-f-]{36})\)', 'g') as m;
  insert into box_activities (box_id, actor_id, type, meta)
  values (
    v_box_id, new.user_id, 'comment_added',
    jsonb_build_object('option_name', v_option_name, 'option_id', new.option_id)
      || case when v_mentioned is null then '{}'::jsonb
              else jsonb_build_object('mentioned_ids', to_jsonb(v_mentioned)) end
  );
  return new;
end; $$;

-- ④ 상자 초대 → 초대받은 사람 알림함에 'invited' 타겟 알림(actor=초대자). 새로 추가된 사람에게만.
--    (participant_joined은 기존대로 별도 발생: 기존 멤버가 "누가 들어왔어요"를 봄. invited는 초대당사자만.)
create or replace function public.invite_users_to_box(p_box_id uuid, p_user_ids uuid[])
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = auth.uid()) then
    raise exception 'not a participant of this box';
  end if;
  with ins as (
    insert into box_participants (box_id, user_id)
    select p_box_id, uid from unnest(p_user_ids) as uid
    on conflict (box_id, user_id) do nothing
    returning user_id
  )
  insert into box_activities (box_id, actor_id, type, target_user_id)
  select p_box_id, auth.uid(), 'invited', user_id from ins;
end; $$;
