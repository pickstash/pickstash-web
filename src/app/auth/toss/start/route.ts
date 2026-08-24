import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'

// 자체 웹 토스 로그인 시작 — CSRF 방지용 state를 httpOnly 쿠키로 심고 토스 로그인 화면으로 리다이렉트.
// 콜백(/auth/toss/callback)이 이 state를 검증한다. client_secret은 서버 전용이라 여긴 client_id만 쓴다.
export const runtime = 'nodejs'

const TOSS_AUTHORIZE = 'https://oauth2.cert.toss.im/authorize'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin
  const clientId = process.env.TOSS_LOGIN_CLIENT_ID
  if (!clientId) return NextResponse.redirect(new URL('/login?error=toss_config', origin))

  const state = randomUUID()
  const authorize = new URL(TOSS_AUTHORIZE)
  authorize.searchParams.set('grant_type', 'authorization_code')
  authorize.searchParams.set('client_id', clientId)
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('redirect_uri', `${origin}/auth/toss/callback`)
  authorize.searchParams.set('scope', 'user_name') // 미니앱과 동일하게 이름만 사용(매핑은 userKey)
  authorize.searchParams.set('state', state)

  const res = NextResponse.redirect(authorize.toString())
  const cookieOpts = { httpOnly: true, secure: true, sameSite: 'lax' as const, path: '/', maxAge: 600 } // 인가코드 유효 10분
  res.cookies.set('toss_oauth_state', state, cookieOpts)
  const next = url.searchParams.get('next')
  if (next && next.startsWith('/')) res.cookies.set('toss_oauth_next', next, cookieOpts)
  return res
}
