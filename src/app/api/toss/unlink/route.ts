import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// 토스 로그인 연결끊기(연동해제) 콜백. 토스 콘솔에 이 URL + Basic Auth를 등록하면,
// 유저가 토스에서 연동을 끊을 때 {userKey, referrer}로 호출된다(GET 쿼리 또는 POST JSON).
// 처리: 해당 유저의 세션/토큰 정리(재로그인 강제) — toss_disconnect RPC(023, 비파괴).
//
// 필요한 환경변수(비밀 — 커밋 금지):
//   TOSS_UNLINK_BASIC          콘솔에 등록한 Basic Auth 자격의 base64("user:pass") 값 (헤더의 "Basic " 뒤 부분)
//   SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL

export const runtime = 'nodejs'

// 콘솔의 콜백 테스트가 브라우저(교차 출처)에서 올 수 있어 CORS 필요(없으면 'Failed to fetch').
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}
const ok = () => NextResponse.json({ ok: true }, { headers: CORS })
const unauthorized = () => new NextResponse('unauthorized', { status: 401, headers: CORS })

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// referrer: UNLINK(연동해제) | WITHDRAWAL_TERMS(약관철회) | WITHDRAWAL_TOSS(토스탈퇴). 셋 다 로그아웃 처리.
function authorized(request: Request): boolean {
  const expected = process.env.TOSS_UNLINK_BASIC
  if (!expected) return false
  const got = request.headers.get('authorization')?.replace(/^Basic\s+/i, '') ?? ''
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function disconnect(userKey: string | number | undefined) {
  if (userKey == null || userKey === '') return
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  await admin.rpc('toss_disconnect', { p_user_key: String(userKey) })
}

export async function GET(request: Request) {
  if (!authorized(request)) return unauthorized()
  const q = new URL(request.url).searchParams
  await disconnect(q.get('userKey') ?? undefined)
  return ok()
}

export async function POST(request: Request) {
  if (!authorized(request)) return unauthorized()
  let userKey: string | number | undefined
  try {
    userKey = (await request.json())?.userKey
  } catch {
    /* 본문 없거나 비JSON → userKey 없음으로 처리(200 반환) */
  }
  await disconnect(userKey)
  return ok()
}
