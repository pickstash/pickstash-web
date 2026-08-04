import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tossRequest } from '@/lib/toss/mtls'
import { decryptTossUserInfo } from '@/lib/toss/decrypt-userinfo'

// 토스 미니앱 로그인 백엔드 (웹앱에 두지만 토스 앱이 네트워크로 호출).
// 흐름: appLogin authCode → (mTLS) generate-token → login-me → userKey
//       → Supabase 유저 find/create(프로필은 handle_new_user 트리거로 자동)
//       → magiclink 발급 → { email, token_hash } 반환 → 토스 앱이 verifyOtp로 세션 확보.
//
// 필요한 환경변수(비밀 — 커밋 금지):
//   TOSS_MTLS_CERT_B64        토스 콘솔에서 발급받은 클라이언트 인증서(PEM)를 base64
//   TOSS_MTLS_KEY_B64         해당 개인키(PEM)를 base64
//   (PFX를 받았다면 TOSS_MTLS_PFX_B64 + TOSS_MTLS_PFX_PASS 로 대체 — 아래 tossAgent 참고)
//   SUPABASE_SERVICE_ROLE_KEY Supabase service_role 키(유저 생성·magiclink 발급용)

export const runtime = 'nodejs' // node:https(mTLS)·admin 사용 → Edge 아님

// 토스 미니앱 웹뷰는 이 엔드포인트를 교차 출처(cross-origin)로 호출한다 → CORS 필수.
// 쿠키/자격증명 없이 JSON 본문만 주고받으므로 Origin '*' 허용으로 충분하다.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS })
}

// CORS preflight 응답. 이 핸들러가 없으면 웹뷰의 POST가 'Failed to fetch'로 막힌다.
export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

type TokenResp = { resultType?: string; success?: { accessToken: string } }
type MeResp = { resultType?: string; success?: { userKey: number | string; name?: string } }

export async function POST(request: Request) {
  let authorizationCode: string | undefined
  let referrer: string | undefined
  try {
    const body = await request.json()
    authorizationCode = body.authorizationCode
    referrer = body.referrer
  } catch {
    return json({ error: 'invalid body' }, 400)
  }
  if (!authorizationCode) {
    return json({ error: 'missing authorizationCode' }, 400)
  }

  try {
    // 1) authCode → accessToken (mTLS)
    const tokenRes = await tossRequest(
      '/api-partner/v1/apps-in-toss/user/oauth2/generate-token',
      'POST',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ authorizationCode, referrer: referrer ?? 'DEFAULT' }),
    )
    const token = tokenRes.json as TokenResp
    if (tokenRes.status !== 200 || token?.resultType !== 'SUCCESS' || !token.success?.accessToken) {
      return json({ error: 'toss token exchange failed', detail: tokenRes.json }, 502)
    }

    // 2) accessToken → userKey (+프로필 정보)
    const meRes = await tossRequest(
      '/api-partner/v1/apps-in-toss/user/oauth2/login-me',
      'GET',
      { Authorization: `Bearer ${token.success.accessToken}` },
    )
    const me = meRes.json as MeResp
    if (meRes.status !== 200 || me?.resultType !== 'SUCCESS' || me.success?.userKey == null) {
      return json({ error: 'toss login-me failed', detail: meRes.json }, 502)
    }
    const userKey = String(me.success.userKey)

    // 3) userKey → Supabase 유저 find/create → magiclink 발급
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const email = `toss_${userKey}@toss.pickstash.app` // 합성 이메일(발송 안 함) — 토스 userKey 결정적 매핑
    // 토스가 준 실제 이름 — login-me의 name은 AES-256-GCM 암호문이라 복호화한다.
    // 복호화 키(TOSS_USERINFO_KEY_B64) 없거나 실패하면 null → 기본값(암호문은 절대 저장 안 함).
    const tossName = decryptTossUserInfo(me.success.name) || '토스 사용자'
    // 없으면 생성(프로필은 on_auth_user_created 트리거로 metadata.name→nickname 자동). 이미 있으면 error 무시.
    await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { provider: 'toss', toss_user_key: userKey, name: tossName },
    })
    const { data: link, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error || !link) {
      return json({ error: 'session mint failed', detail: error?.message }, 500)
    }

    // 기존 유저가 아직 기본 닉네임이면 실제 이름으로 backfill. 사용자가 직접 바꾼 닉네임은 건드리지 않는다.
    if (tossName !== '토스 사용자' && link.user?.id) {
      await admin.from('profiles').update({ nickname: tossName }).eq('id', link.user.id).eq('nickname', '토스 사용자')
    }

    return json({ email, token_hash: link.properties.hashed_token })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return json({ error: 'toss login error', detail: msg }, 500)
  }
}
