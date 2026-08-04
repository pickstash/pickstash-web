import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tossRequest } from '@/lib/toss/mtls'

// 토스 스마트 발송(기능성 메시지) 푸시 트리거. send-push 엣지 함수가 이 라우트로 프록시한다.
// (엣지 Deno는 mTLS 클라이언트 인증서가 불안정 → 검증된 node:https 배관을 재사용)
// 흐름: {box_id|folder_id, triggered_by, target_user_ids?, message_key}
//   → service_role로 대상(상자 참여자 / 폴더 멤버) 조회 → 각자 토스 userKey 해석
//   → 토스 userKey가 있는 사람에게만 send-bulk-message(templateSetCode + context 개인화)
//
// 필요한 환경변수(비밀 — 커밋 금지):
//   TOSS_NOTIFY_SECRET        엣지 프록시와 공유하는 내부 시크릿(무단 발송 방지)
//   TOSS_TPL_{COMMENT,OPTION,DECISION,JOIN}  이벤트별 콘솔 소재 발송 코드(=templateSetCode). 미설정 시 아래 기본값
//   TOSS_MTLS_*               mTLS 인증서(로그인 라우트와 공유)
//   SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL

export const runtime = 'nodejs' // node:https(mTLS)·admin 사용 → Edge 아님

type MessageKey = 'comment' | 'option' | 'decision' | 'mention' | 'join'

// 콘솔 스마트 발송은 소재마다 내용이 고정이라 이벤트별로 발송 코드를 나눈다.
// 멘션은 댓글 계열이라 댓글 소재를 공용(별도 소재를 원하면 mention 키 추가).
const TEMPLATE_CODE: Record<MessageKey, string> = {
  comment: process.env.TOSS_TPL_COMMENT ?? 'pickstash-comment',
  option: process.env.TOSS_TPL_OPTION ?? 'pickstash-option',
  decision: process.env.TOSS_TPL_DECISION ?? 'pickstash-decision',
  mention: process.env.TOSS_TPL_COMMENT ?? 'pickstash-comment',
  join: process.env.TOSS_TPL_JOIN ?? 'pickstash-join',
}

interface RequestBody {
  box_id?: string
  folder_id?: string // 폴더 참여 알림용 (box_id 없을 때)
  triggered_by: string
  target_user_ids?: string[]
  message_key?: MessageKey
}

// 문구는 콘솔 소재에 고정으로 쓴다(예: 댓글 소재 본문 = "{{userName}}님이 댓글을 달았어요").
// 토스 스마트발송 기본 변수는 {{userName}} 하나뿐이라, 서버는 발신자 닉네임만 userName으로 보내고
// 문장/딥링크 골격은 소재가 갖는다. 이벤트별 문구 차이는 소재(templateSetCode)를 나눠서 표현.

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
  const { box_id, folder_id, triggered_by, target_user_ids, message_key } = body
  if (!triggered_by || (!box_id && !folder_id)) {
    return NextResponse.json({ error: 'missing triggered_by/box_id|folder_id' }, { status: 400 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 대상 엔티티(상자/폴더) 해석: 제목 · 수신자(본인 제외) · 딥링크
  const isFolder = !box_id && !!folder_id
  let userIds: string[]
  // 콘솔 소재의 이동 URL을 intoss://pickstash/{{deepLinkPath}} 로 등록 → 여기서 경로만 채운다.
  // (풀 URL을 통째로 변수화하면 콘솔 URL 검증에 걸릴 수 있어 스킴/호스트는 콘솔에 고정)
  let deepLinkPath: string

  if (isFolder) {
    const { data: folder } = await admin.from('folders').select('id').eq('id', folder_id!).single()
    if (!folder) return NextResponse.json({ error: 'folder not found' }, { status: 404 })
    const { data: members } = await admin
      .from('folder_members')
      .select('user_id')
      .eq('folder_id', folder_id!)
      .neq('user_id', triggered_by)
    userIds = (members ?? []).map(m => m.user_id)
    deepLinkPath = `folder/${folder_id}`
  } else {
    const { data: box } = await admin.from('boxes').select('id').eq('id', box_id!).single()
    if (!box) return NextResponse.json({ error: 'box not found' }, { status: 404 })
    if (target_user_ids?.length) {
      userIds = target_user_ids.filter(id => id !== triggered_by)
    } else {
      const { data: participants } = await admin
        .from('box_participants')
        .select('user_id')
        .eq('box_id', box_id!)
        .neq('user_id', triggered_by)
      userIds = (participants ?? []).map(p => p.user_id)
    }
    deepLinkPath = `box/${box_id}`
  }
  if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 })

  // 발신자 닉네임 — 소재 본문의 {{userName}}에 채운다("{{userName}}님이 댓글을 달았어요").
  let userName = '누군가'
  const { data: actor } = await admin.from('profiles').select('nickname').eq('id', triggered_by).single()
  if (actor?.nickname) userName = actor.nickname

  // 각 대상의 토스 userKey 해석 — 토스 유저(userKey 보유)만 발송 대상
  const users = await Promise.all(userIds.map(id => admin.auth.admin.getUserById(id)))
  const contextList = users
    .map(u => tossUserKeyOf(u.data.user))
    .filter((k): k is number => k != null)
    .map(userKey => ({ userKey, context: { userName, deepLinkPath } }))

  if (!contextList.length) return NextResponse.json({ ok: true, sent: 0 })

  const res = await tossRequest(
    '/api-partner/v1/apps-in-toss/messenger/send-bulk-message',
    'POST',
    { 'Content-Type': 'application/json' },
    JSON.stringify({
      templateSetCode: TEMPLATE_CODE[message_key ?? 'comment'],
      contextList,
    }),
  )
  if (res.status !== 200) return NextResponse.json({ error: 'toss send failed', detail: res.json }, { status: 502 })
  return NextResponse.json({ ok: true, sent: contextList.length })
}
