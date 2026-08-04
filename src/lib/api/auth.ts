import { createClient } from '@/lib/supabase/client'

export async function signInWithKakao() {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'profile_nickname profile_image',
      queryParams: {
        scope: 'profile_nickname profile_image',
      },
    },
  })
  if (error) throw error
}

export async function signOut() {
  const supabase = createClient()
  // scope:'local' — 서버 /logout 네트워크 호출 없이 로컬 세션만 즉시 제거.
  // (global은 토스 웹뷰에서 네트워크가 멈추면 로그아웃 모달 딤이 안 닫히고 프리즈됨.)
  // 실패해도 던지지 않는다 — 로그아웃은 항상 로컬에서 성사돼야 한다.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}

export async function getSession() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}
