-- 033_box_mode_checklist.sql — 상자 "목적" 선택 (결정형/체크형) 스키마
-- 배경: 실사용 관찰(혼자·여럿 상자 모두 투표 없이 리스트만 공유하는 패턴, 예: 쇼핑리스트) →
--   상자 생성 시 목적을 명시적으로 고르게 한다. 기획 정리: 아이템=선택지(사진 첨부 필요해서),
--   그룹(카테고리)은 선택지에 붙는 선택적 라벨(강제 구조 아님), 폴더는 관련 없음(범용 유지).
-- boxes.mode: 'decide'(기존 전체 동작) | 'checklist'(신규). 생성 시 고정 — 이후 변경 불가(새 상자로).
-- options.checked_at: decided_at과 같은 결의 파생 상태 컬럼. checklist 상자에서만 의미 있음.
-- options.group_label: 선택적 카테고리 텍스트. 없으면 flat, 있으면 그룹으로 묶어 렌더.
-- 재실행 안전(add column if not exists / drop+add constraint). ⚠️ 라이브 DB: 이 마이그레이션을
-- 의존 코드 push 전에 대시보드 SQL Editor에서 먼저 적용할 것.

alter table boxes add column if not exists mode text not null default 'decide';
alter table boxes drop constraint if exists boxes_mode_chk;
alter table boxes add constraint boxes_mode_chk check (mode in ('decide', 'checklist'));

alter table options add column if not exists checked_at timestamptz;  -- null=미체크, 값=체크됨(checklist 상자 전용)
alter table options add column if not exists group_label text;        -- null=그룹 없음(flat)

-- create_box RPC에 p_mode 추가. checklist면 decision_mode·deadline_at은 의미 없어 기본값으로 고정한다
-- (기존 컬럼 재사용 — decide 상자와 스키마를 분리하지 않는다).
create or replace function public.create_box(
  p_title text,
  p_memo text default null,
  p_decision_mode text default 'manual',
  p_deadline_at timestamptz default null,
  p_mode text default 'decide'
) returns public.boxes
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  _uid uuid := auth.uid();
  _id  uuid := gen_random_uuid();
  _box public.boxes;
begin
  if _uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.boxes (id, title, memo, decision_mode, deadline_at, mode)
  values (
    _id,
    p_title,
    nullif(p_memo, ''),
    case when p_mode = 'checklist' then 'manual' else coalesce(p_decision_mode, 'manual') end,
    case when p_mode = 'checklist' or p_decision_mode <> 'auto_deadline' then null else p_deadline_at end,
    coalesce(p_mode, 'decide')
  );

  insert into public.box_participants (box_id, user_id) values (_id, _uid);

  select * into _box from public.boxes where id = _id;
  return _box;
end;
$$;

grant execute on function public.create_box(text, text, text, timestamptz, text) to authenticated;

-- 체크 토글은 단일 행(options)의 checked_at만 바꾸는 단순 update라 별도 RPC/잠금이 필요 없다
-- (아이템=선택지라 서로 다른 항목을 동시에 체크해도 행이 달라 경합이 없음 — 기존 "options: 참여자 수정"
-- RLS 정책으로 충분). 그래서 이 마이그레이션엔 새 RPC나 정책 변경이 없다.

-- 초대 링크 읽기 전용 뷰어(014)도 mode/checked_at/group_label을 내려줘야 체크형 상자를 비로그인
-- 뷰어에서도 볼 수 있다. 014의 jsonb 스냅샷 함수를 그대로 create or replace(다른 필드는 그대로).
create or replace function get_box_view_by_invite_code(p_code text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id',                b.id,
    'title',             b.title,
    'memo',              b.memo,
    'decision_mode',     b.decision_mode,
    'mode',              b.mode,
    'deadline_at',       b.deadline_at,
    'closed_at',         b.closed_at,
    'created_at',        b.created_at,
    'updated_at',        b.updated_at,
    'invite_code',       b.invite_code,
    'participant_count', (select count(*) from box_participants bp where bp.box_id = b.id),
    'participants', coalesce((
      select jsonb_agg(
               jsonb_build_object('id', pr.id, 'nickname', pr.nickname, 'avatar_url', pr.avatar_url)
               order by bp.joined_at
             )
      from box_participants bp
      join profiles pr on pr.id = bp.user_id
      where bp.box_id = b.id
    ), '[]'::jsonb),
    'options', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',          o.id,
                 'name',        o.name,
                 'content',     o.content,
                 'decided_at',  o.decided_at,
                 'checked_at',  o.checked_at,
                 'group_label', o.group_label,
                 'created_at',  o.created_at,
                 'created_by',  o.created_by,
                 'like_count', (
                   select count(*) from votes v
                   where v.option_id = o.id and v.vote_type = 'like'
                 ),
                 'comments', coalesce((
                   select jsonb_agg(
                            jsonb_build_object(
                              'id',                c.id,
                              'body',              c.body,
                              'parent_comment_id', c.parent_comment_id,
                              'edited_at',         c.edited_at,
                              'created_at',        c.created_at,
                              'user_id',           c.user_id,
                              'nickname',          cp.nickname,
                              'avatar_url',        cp.avatar_url,
                              'like_count',        (
                                select count(*) from comment_likes cl
                                where cl.comment_id = c.id
                              )
                            )
                            order by c.created_at
                          )
                   from comments c
                   join profiles cp on cp.id = c.user_id
                   where c.option_id = o.id
                 ), '[]'::jsonb)
               )
               order by o.created_at
             )
      from options o
      where o.box_id = b.id
    ), '[]'::jsonb)
  )
  from boxes b
  where b.invite_code = p_code;
$$;

grant execute on function get_box_view_by_invite_code(text) to anon, authenticated;
