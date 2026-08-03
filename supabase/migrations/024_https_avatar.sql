-- 024 카카오 아바타 https 강제
-- 카카오 OAuth는 avatar_url을 http://k.kakaocdn.net/... (비보안)로 준다.
-- https 페이지(웹·토스 웹뷰)에선 mixed-content로 차단돼 프로필 사진이 깨진다.
-- 카카오 CDN은 https를 지원하므로 선행 scheme만 올린다(쿼리 내 fname=http://는 서버간 fetch라 유지).
-- idempotent: create or replace + 조건부 update.

update public.profiles
   set avatar_url = regexp_replace(avatar_url, '^http://', 'https://')
 where avatar_url ~ '^http://';

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1),
      'user'
    ),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'avatar_url',''), '^http://', 'https://'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
