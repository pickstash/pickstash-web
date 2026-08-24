import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { decryptTossUserInfo } from '@/lib/toss/decrypt-userinfo'

// 자체 웹 토스 로그인 콜백. 흐름(앱인토스 /api/toss/login과 동일한 뒷단, 앞단만 OAuth 리다이렉트):
//   토스 code → (token) access_token → (me) userKey(+암호화 name)
//   → Supabase 유저 find/create(toss_{userKey} 합성 이메일 — 미니앱과 같은 매핑 → 계정 통일)
//   → magiclink 발급 → 서버 verifyOtp로 세션 쿠키 설정 → 홈으로.
//
// 필요한 env(비밀 — 커밋 금지, 프로덕션은 Vercel env):
//   TOSS_LOGIN_CLIENT_ID / TOSS_LOGIN_CLIENT_SECRET  토스 인증부서 발급
//   TOSS_LOGIN_USERINFO_KEY_B64 / TOSS_LOGIN_USERINFO_AAD  개인정보 복호화 키(AAD=TOSS)
//   SUPABASE_SERVICE_ROLE_KEY  유저 생성·magiclink 발급용
export const runtime = 'nodejs' // node:crypto·admin·mTLS 없는 순수 fetch → Edge 아님

const TOSS_TOKEN = 'https://oauth2.cert.toss.im/token'
// DI 미포함 엔드포인트(호출 횟수 제한 없음) — 우린 userKey·name만 필요, CI/DI 불필요.
const TOSS_ME = 'https://oauth2.cert.toss.im/oauth2/api/login/user/me/without-di'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, origin))

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.get('error') || !code) return fail('toss_denied')

  const jar = await cookies()
  const savedState = jar.get('toss_oauth_state')?.value
  const next = jar.get('toss_oauth_next')?.value
  if (!savedState || savedState !== state) return fail('toss_state') // CSRF 방지

  const clientId = process.env.TOSS_LOGIN_CLIENT_ID
  const clientSecret = process.env.TOSS_LOGIN_CLIENT_SECRET
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!clientId || !clientSecret || !serviceRole) return fail('toss_config')

  try {
    // 1) code → access_token
    const tokenRes = await fetch(TOSS_TOKEN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${origin}/auth/toss/callback`,
      }),
    })
    const token = (await tokenRes.json()) as { access_token?: string }
    if (!tokenRes.ok || !token.access_token) return fail('toss_token')

    // 2) access_token → userKey (+암호화 name)
    const meRes = await fetch(TOSS_ME, { headers: { Authorization: `Bearer ${token.access_token}` } })
    const me = (await meRes.json()) as { resultType?: string; success?: { userKey?: number | string; name?: string } }
    if (!meRes.ok || me?.resultType !== 'SUCCESS' || me.success?.userKey == null) return fail('toss_me')
    const userKey = String(me.success.userKey)
    const tossName =
      decryptTossUserInfo(me.success.name, process.env.TOSS_LOGIN_USERINFO_KEY_B64, process.env.TOSS_LOGIN_USERINFO_AAD) ||
      '토스 사용자'

    // 3) userKey → Supabase 유저 find/create → magiclink (미니앱과 동일 합성 이메일 → 같은 계정)
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const email = `toss_${userKey}@toss.pickstash.app`
    // 없으면 생성(프로필은 트리거가 metadata.name→nickname 자동). 이미 있으면 error 무시.
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { provider: 'toss', toss_user_key: userKey, name: tossName },
    })
    const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error || !link) return fail('toss_session')
    // 기존 유저가 아직 기본 닉네임이면 실제 이름으로 backfill(사용자가 바꾼 닉네임은 안 건드림).
    if (tossName !== '토스 사용자' && link.user?.id) {
      await admin.from('profiles').update({ nickname: tossName }).eq('id', link.user.id).eq('nickname', '토스 사용자')
    }

    // 4) 서버(SSR)에서 magiclink verifyOtp → 세션 쿠키 설정(/auth/callback과 동일한 세션 확립 방식)
    const supabase = await createClient()
    const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: 'magiclink' })
    if (otpErr) return fail('toss_session')

    jar.delete('toss_oauth_state')
    jar.delete('toss_oauth_next')
    return NextResponse.redirect(new URL(next && next.startsWith('/') ? next : '/', origin))
  } catch {
    return fail('toss_error')
  }
}
