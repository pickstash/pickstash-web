-- 036_profile_handle.sql — 인스타식 프로필 기반: 고유 @handle + 소개(bio)
-- 개편(docs/redesign-2026-08.md) M2. 추가전용(무중단): 컬럼은 nullable, 구 앱은 몰라도 그대로 동작.
-- 재실행 안전(idempotent). Supabase 브랜치 리허설 후 대시보드 적용.

-- 1) 컬럼 (nullable — 기존 유저는 handle 미설정 상태로 시작, 최초 1회 설정)
alter table profiles add column if not exists handle text;
alter table profiles add column if not exists bio text;

-- 2) 형식 제약: 소문자/숫자/밑줄 3~20자. null 허용(미설정).
alter table profiles drop constraint if exists profiles_handle_fmt;
alter table profiles add constraint profiles_handle_fmt
  check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');

-- 3) 대소문자 무시 고유(설정된 것만). 검색/조회용 인덱스 겸용.
create unique index if not exists profiles_handle_lower_uniq
  on profiles (lower(handle)) where handle is not null;

-- 4) 핸들 확정 RPC — 형식·중복 검증 후 본인(auth.uid()) 것으로 설정.
--    security definer: 중복 검사를 위해 다른 행을 봐야 하므로(프로필 SELECT는 authenticated 전체 허용이라 사실 불필요하지만 명시).
create or replace function claim_handle(p_handle text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_norm text := lower(trim(p_handle));
begin
  if v_uid is null then
    raise exception '로그인이 필요해요';
  end if;
  if v_norm !~ '^[a-z0-9_]{3,20}$' then
    raise exception '아이디는 소문자·숫자·밑줄 3~20자예요';
  end if;
  if exists (select 1 from profiles where lower(handle) = v_norm and id <> v_uid) then
    raise exception '이미 사용 중인 아이디예요';
  end if;
  update profiles set handle = v_norm where id = v_uid;
end;
$$;

grant execute on function claim_handle(text) to authenticated;
