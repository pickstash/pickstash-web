-- 037_box_visibility_tags.sql — 상자 공개(비공개 기본) + 태그
-- 개편 M2. 추가전용(무중단): visibility 기본 'private' → 구 앱은 무시하고 현행대로 동작.
-- 공개 열람 경로(anon/authenticated)는 040에서 definer RPC로. 여기선 컬럼·토글만(RLS 미변경).
-- 재실행 안전.

-- 1) 컬럼: 공개여부 / 공개자 / 공개시각 / 태그
alter table boxes add column if not exists visibility text not null default 'private';
alter table boxes drop constraint if exists boxes_visibility_chk;
alter table boxes add constraint boxes_visibility_chk check (visibility in ('private', 'public'));
alter table boxes add column if not exists published_by uuid references profiles(id) on delete set null;
alter table boxes add column if not exists published_at timestamptz;
alter table boxes add column if not exists tags text[] not null default '{}';

-- 2) 탐색/피드용 인덱스 (공개 상자만)
create index if not exists boxes_public_recent_idx on boxes (published_at desc) where visibility = 'public';
create index if not exists boxes_public_tags_idx on boxes using gin (tags) where visibility = 'public';

-- 3) 공개 토글 RPC — 참여자만 가능. 공개 시 published_by=본인·published_at=now()·태그 저장. 비공개면 초기화.
create or replace function set_box_visibility(p_box_id uuid, p_public boolean, p_tags text[] default '{}')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception '로그인이 필요해요'; end if;
  if not exists (select 1 from box_participants where box_id = p_box_id and user_id = v_uid) then
    raise exception '참여자만 공개할 수 있어요';
  end if;
  if p_public then
    update boxes set visibility = 'public', published_by = v_uid, published_at = now(),
      tags = coalesce(p_tags, '{}') where id = p_box_id;
  else
    update boxes set visibility = 'private', published_by = null, published_at = null, tags = '{}'
      where id = p_box_id;
  end if;
end;
$$;

grant execute on function set_box_visibility(uuid, boolean, text[]) to authenticated;
