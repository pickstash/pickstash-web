-- 023 토스 로그인 연결끊기(연동해제) 콜백 처리
-- 토스가 등록된 콜백 URL로 {userKey, referrer} 이벤트를 보낸다(UNLINK/WITHDRAWAL_TERMS/WITHDRAWAL_TOSS).
-- 출시 요건: 이벤트 수신 시 세션/토큰 정리(재로그인 강제).
--
-- 여기서는 비파괴로 세션·리프레시토큰만 삭제한다 → 재연동(같은 userKey→같은 합성 이메일 유저)
-- 시 상자·폴더 데이터가 그대로 복구된다. 완전 탈퇴(데이터 삭제)는 회원탈퇴 플로우(delete_account)로 별도.
-- service_role(서버 라우트)만 호출. anon/authenticated는 실행 불가.
-- idempotent: create or replace + revoke.

create or replace function public.toss_disconnect(p_user_key text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_id uuid;
begin
  select id into v_id from auth.users
   where email = 'toss_' || p_user_key || '@toss.pickstash.app';
  if v_id is null then return; end if;
  delete from auth.sessions where user_id = v_id;
  delete from auth.refresh_tokens where user_id = v_id;
end $$;

revoke all on function public.toss_disconnect(text) from public, anon, authenticated;
