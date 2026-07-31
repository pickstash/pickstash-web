import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tossRequest } from '@/lib/toss/mtls'

// 토스 스마트 발송(기능성 메시지) 푸시 트리거. send-push 엣지 함수가 이 라우트로 프록시한다.
// (엣지 Deno는 mTLS 클라이언트 인증서가 불안정 → 검증된 node:https 배관을 재사용)
// 흐름: {box_id, triggered_by, target_user_ids?, message_key?}
//   → service_role로 대상 참여자 조회 → 각자 토스 userKey 해석(합성 이메일/메타데이터)
//   → 토스 userKey가 있는 사람에게만 send-bulk-message(templateSetCode + context 개인화)
//
// 필요한 환경변수(비밀 — 커밋 금지):
//   TOSS_NOTIFY_SECRET        엣지 프록시와 공유하는 내부 시크릿(무단 발송 방지)
//   TOSS_TPL_{COMMENT,OPTION,DECISION}  이벤트별 콘솔 소재 발송 코드(=templateSetCode). 미설정 시 아래 기본값
//   TOSS_MTLS_*               mTLS 인증서(로그인 라우트와 공유)
//   SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL

export const runtime = 'nodejs' // node:https(mTLS)·admin 사용 → Edge 아님

type MessageKey = 'comment' | 'option' | 'decision' | 'mention'

// 콘솔 스마트 발송은 소재마다 내용이 고정이라 이벤트별로 발송 코드를 나눈다.
// 멘션은 댓글 계열이라 댓글 소재를 공용(별도 소재를 원하면 mention 키 추가).
const TEMPLATE_CODE: Record<MessageKey, string> = {
  comment: process.env.TOSS_TPL_COMMENT ?? 'pickstash-comment',
  option: process.env.TOSS_TPL_OPTION ?? 'pickstash-option',
  decision: process.env.TOSS_TPL_DECISION ?? 'pickstash-decision',
  mention: process.env.TOSS_TPL_COMMENT ?? 'pickstash-comment',
}

interface RequestBody {
  box_id: string
  triggered_by: string
  target_user_ids?: string[]
  message_key?: MessageKey
}

const DEEP_LINK = (boxId: string) => `intoss://pickstash/box/${boxId}`

// 콘솔 소재 본문은 단일 변수 {pushBody}로 등록 — 서버가 이벤트별 문구를 채운다.
function pushBodyFor(key: MessageKey | undefined, boxTitle: string, actorNickname: string): string {
  const prefix = `[${boxTitle}] `
  switch (key) {
    case 'comment': return `${prefix}새 댓글이 달렸어요`
    case 'option': return `${prefix}새 선택지가 추가됐어요`
    case 'decision': return `${prefix}정리가 끝났어요`
    case 'mention': return `${actorNickname}님이 회원님을 언급했어요`
    default: return `${prefix}새로운 소식이 있어요`
  }
}

// 토스 userKey: 로그인 시 메타데이터(toss_user_key) 또는 합성 이메일(toss_{userKey}@...)에 결정적으로 담긴다.
function tossUserKeyOf(user: { email?: string; user_metadata?: Record<string, unknown> } | null): number | null {
  const meta = user?.user_metadata?.toss_user_key
  if (meta != null && Number.isFinite(Number(meta))) return Number(meta)
  const m = user?.email?.match(/^toss_(\d+)@/)
  return m ? Number(m[1]) : null
}

export async function POST(request: Request) {
  if (request.headers.get('x-internal-secret') !== process.env.TOSS_NOTIFY_SECRET) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }
  const { box_id, triggered_by, target_user_ids, message_key } = body
  if (!box_id || !triggered_by) return NextResponse.json({ error: 'missing box_id/triggered_by' }, { status: 400 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 상자 제목
  const { data: box } = await admin.from('boxes').select('title').eq('id', box_id).single()
  if (!box) return NextResponse.json({ error: 'box not found' }, { status: 404 })

  // 대상: 지정(멘션) 또는 참여자 전체 — 본인 제외
  let userIds: string[]
  if (target_user_ids?.length) {
    userIds = target_user_ids.filter(id => id !== triggered_by)
  } else {
    const { data: participants } = await admin
      .from('box_participants')
      .select('user_id')
      .eq('box_id', box_id)
      .neq('user_id', triggered_by)
    userIds = (participants ?? []).map(p => p.user_id)
  }
  if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 })

  // 멘션이면 발신자 닉네임
  let actorNickname = '누군가'
  if (message_key === 'mention') {
    const { data: actor } = await admin.from('profiles').select('nickname').eq('id', triggered_by).single()
    if (actor?.nickname) actorNickname = actor.nickname
  }

  // 각 대상의 토스 userKey 해석 — 토스 유저(userKey 보유)만 발송 대상
  const users = await Promise.all(userIds.map(id => admin.auth.admin.getUserById(id)))
  const pushBody = pushBodyFor(message_key, box.title, actorNickname)
  const deepLinkUrl = DEEP_LINK(box_id)
  const contextList = users
    .map(u => tossUserKeyOf(u.data.user))
    .filter((k): k is number => k != null)
    .map(userKey => ({ userKey, context: { pushBody, deepLinkUrl } }))

  if (!contextList.length) return NextResponse.json({ ok: true, sent: 0 })

  const res = await tossRequest(
    '/api-partner/v1/apps-in-toss/messenger/send-bulk-message',
    'POST',
    { 'Content-Type': 'application/json' },
    JSON.stringify({
      templateSetCode: process.env.TOSS_PUSH_TEMPLATE_CODE ?? 'pickstash-activity',
      contextList,
    }),
  )
  if (res.status !== 200) return NextResponse.json({ error: 'toss send failed', detail: res.json }, { status: 502 })
  return NextResponse.json({ ok: true, sent: contextList.length })
}
