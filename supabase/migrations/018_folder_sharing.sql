-- 018_folder_sharing.sql — 폴더 공유(뷰어 + 참여) + 상자 다중 폴더 포함. spec §3-7 확장.
-- 배경: 폴더를 통째로 링크 공유한다.
--   (1) 비로그인 읽기전용 뷰어 — 폴더 안 상자 목록을 보고, 각 상자는 상자 읽기전용 뷰어(/invite/[code])로.
--   (2) 로그인 후 '참여' — 폴더 안 모든 상자에 참여자로 등록 + 폴더를 내 계정으로 복사(초대자가 만든 것처럼).
--       이미 참여 중인 상자는 그대로 유지(on conflict do nothing).
-- 스키마 변경:
--   (A) folders.invite_code — 상자처럼 예측불가 8자 공유코드(뷰어/참여 링크).
--   (B) folders.source_folder_id — '참여'로 복사된 폴더의 원본(재참여 시 중복 폴더 방지 + 멱등).
--   (C) box_folders PK (user_id, box_id) → (user_id, box_id, folder_id): 상자 다중 폴더 포함 허용.
-- ⚠️ 라이브 DB: 코드 push 전에 대시보드에서 먼저 적용. 여러 번 실행해도 안전(idempotent).
-- ⚠️ (C) 적용 후 box_folders upsert의 onConflict 타깃이 'user_id,box_id,folder_id'로 바뀐다.
--     구 코드('user_id,box_id' onConflict)와 호환 안 되므로 마이그레이션 적용과 코드 배포를 함께 진행할 것.

-- ─────────────────────────────────────────────────────────────
-- (A) folders.invite_code
alter table folders add column if not exists invite_code text;
-- 기존 행 백필(각 폴더에 고유 코드). id를 섞어 충돌 확률↓.
update folders set invite_code = substr(md5(random()::text || id::text), 1, 8)
  where invite_code is null;
create unique index if not exists folders_invite_code_key on folders(invite_code);
alter table folders alter column invite_code set default substr(md5(random()::text), 1, 8);
alter table folders alter column invite_code set not null;

-- (B) folders.source_folder_id — 복사 원본(멱등 재참여용). 원본 삭제돼도 내 복사본은 유지 → set null.
alter table folders add column if not exists source_folder_id uuid
  references folders(id) on delete set null;
create index if not exists folders_source_idx on folders(user_id, source_folder_id);

-- (C) box_folders PK 확장: 상자 다중 폴더 포함 (재실행 안전 — 같은 이름으로 drop 후 재생성)
alter table box_folders drop constraint if exists box_folders_pkey;
alter table box_folders add constraint box_folders_pkey primary key (user_id, box_id, folder_id);

-- ─────────────────────────────────────────────────────────────
-- RPC (1) OG 메타태그용 폴더 이름 조회 (비로그인 포함, RLS 우회 제한 노출)
create or replace function get_folder_by_invite_code(p_code text)
returns table (id uuid, name text) as $$
  select id, name from folders where invite_code = p_code;
$$ language sql security definer set search_path = public;
grant execute on function get_folder_by_invite_code(text) to anon, authenticated;

-- RPC (2) 폴더 뷰어(§3-7 공유): 비로그인 포함 누구나 폴더 + 그 안 상자 목록 스냅샷(jsonb).
--   공유자(폴더 owner)의 box_folders 분류를 읽어 상자 카드용 요약 반환. 순수 조회(쓰기 없음).
--   각 상자는 자기 invite_code로 상자 읽기전용 뷰어(/invite/[code])로 연결한다.
create or replace function get_folder_view_by_invite_code(p_code text)
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object(
    'id',             f.id,
    'name',           f.name,
    'owner_id',       f.user_id,
    'owner_nickname', (select nickname from profiles where id = f.user_id),
    'boxes', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id',                b.id,
                 'title',             b.title,
                 'decision_mode',     b.decision_mode,
                 'deadline_at',       b.deadline_at,
                 'closed_at',         b.closed_at,
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
                 'total_likes', (
                   select count(*) from votes v
                   join options o on o.id = v.option_id
                   where o.box_id = b.id and v.vote_type = 'like'
                 )
               )
               order by bf.sort, bf.created_at
             )
      from box_folders bf
      join boxes b on b.id = bf.box_id
      where bf.user_id = f.user_id and bf.folder_id = f.id
    ), '[]'::jsonb)
  )
  from folders f
  where f.invite_code = p_code;
$$;
grant execute on function get_folder_view_by_invite_code(text) to anon, authenticated;

-- RPC (3) 폴더 참여: 폴더 안 모든 상자에 현재 유저를 참여자로 등록(이미 참여 중이면 유지)
--   + 폴더를 내 계정으로 복사(초대자가 만든 것처럼). 재참여 멱등(source_folder_id로 기존 복사본 재사용).
--   반환: 내 폴더 id(복사본, 또는 내가 owner면 원본).
create or replace function join_folder_by_invite_code(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_src folders%rowtype;
  v_myfolder uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_src from folders where invite_code = p_code;
  if v_src.id is null then raise exception 'invalid folder code'; end if;

  -- 내 폴더면 복사 없이 원본으로.
  if v_src.user_id = v_uid then return v_src.id; end if;

  -- (1) 폴더 안 모든 상자에 참여자 등록 (이미 참여 중이면 그대로 유지)
  insert into box_participants (box_id, user_id)
  select bf.box_id, v_uid
  from box_folders bf
  where bf.user_id = v_src.user_id and bf.folder_id = v_src.id
  on conflict do nothing;

  -- (2) 내 복사 폴더 찾기/생성 (재참여 멱등)
  select id into v_myfolder from folders
  where user_id = v_uid and source_folder_id = v_src.id
  limit 1;
  if v_myfolder is null then
    insert into folders (user_id, name, source_folder_id)
    values (v_uid, v_src.name, v_src.id)
    returning id into v_myfolder;
  end if;

  -- (3) 상자↔폴더 분류를 내 폴더로 복사 (다중 PK 이후 conflict 타깃 3열)
  insert into box_folders (user_id, box_id, folder_id, sort)
  select v_uid, bf.box_id, v_myfolder, bf.sort
  from box_folders bf
  where bf.user_id = v_src.user_id and bf.folder_id = v_src.id
  on conflict (user_id, box_id, folder_id) do nothing;

  return v_myfolder;
end;
$$;
grant execute on function join_folder_by_invite_code(text) to authenticated;
