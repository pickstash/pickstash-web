import { createClient } from '@/lib/supabase/client'

export interface AlertItem {
  id: string
  boxId: string
  boxTitle: string
  optionId: string | null // 있으면 그 선택지 상세까지 이동(026 이후 활동)
  type: string
  actorId: string // 행위자(join_requested면 신청자) — 알림함 내 수락/거절에 사용
  actorNickname: string
  meta: { option_name?: string; vote_type?: string }
  createdAt: string
  unseen: boolean
  joinStatus?: 'pending' | 'approved' | 'rejected' // join_requested 항목의 처리 상태(046)
}

/**
 * 알림함 = 내가 참여한 상자들에서 "다른 참여자"가 한 활동을 최신순 평면 리스트로.
 * box_activities 기반(내 활동 제외). unseen = 내 last_seen_at 이후 활동.
 * 푸시 탭 → /alerts 진입점의 데이터. 상자별 그룹인 getShakingBoxes와 달리 활동 단위로 편다.
 */
type ActRow = {
  id: string
  box_id: string
  type: string
  meta: Record<string, unknown> | null
  created_at: string
  target_user_id: string | null
  actor_id: string | null
  profiles: { nickname: string } | null
}
const ACT_SELECT = 'id, box_id, type, meta, created_at, target_user_id, actor_id, profiles:actor_id(nickname)'

export async function getAlerts(limit = 100): Promise<AlertItem[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 타겟 알림(거절 등 — 참여 상자가 아닌 알림) 읽음 기준: 개인 alerts_seen_at(055).
  // alerts_seen_at은 types.ts 미갱신 컬럼 — 저장소 관례대로 캐스팅.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prof } = await (supabase.from('profiles') as any).select('alerts_seen_at').eq('id', user.id).maybeSingle()
  const alertsSeenAt = prof?.alerts_seen_at ? new Date(prof.alerts_seen_at as string) : null

  const { data: participants } = await supabase
    .from('box_participants')
    .select('box_id, last_seen_at, joined_at, boxes(id, title)')
    .eq('user_id', user.id)
  const parts = participants ?? []

  const boxIds = parts.map(p => p.box_id)
  const titleMap = new Map(
    parts.map(p => [p.box_id, (p.boxes as unknown as { title?: string } | null)?.title ?? '상자']),
  )
  const lastSeenMap = new Map(parts.map(p => [p.box_id, new Date(p.last_seen_at)]))
  // 초대/가입 이전 활동은 알림에서 제외 — 새로 참여한 사람에게 상자의 과거 내역이 쏟아지지 않게.
  const joinedAtMap = new Map(
    parts.map(p => {
      const j = (p as unknown as { joined_at: string | null }).joined_at
      return [p.box_id, j ? new Date(j) : null] as const
    }),
  )

  // 참여 신청 처리 상태 — join_requested 항목을 pending/처리됨으로 구분(046). RLS: 참여자는 조회 가능.
  // join_requests는 types.ts 미갱신 테이블 — 저장소 관례대로 캐스팅(listJoinRequests와 동일).
  const joinStatusMap = new Map<string, 'pending' | 'approved' | 'rejected'>()
  if (boxIds.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reqData } = await (supabase.from('join_requests' as any) as any)
      .select('box_id, user_id, status')
      .in('box_id', boxIds)
    for (const r of (reqData ?? []) as { box_id: string; user_id: string; status: 'pending' | 'approved' | 'rejected' }[]) {
      joinStatusMap.set(`${r.box_id}:${r.user_id}`, r.status)
    }
  }

  // ① 내가 참여한 상자의 활동(내 활동 제외 — 단 자동마감은 전원, 타겟 알림은 나에게 온 것만).
  let mineRows: ActRow[] = []
  if (boxIds.length) {
    const { data } = await supabase
      .from('box_activities')
      .select(ACT_SELECT)
      .in('box_id', boxIds)
      .or(`type.eq.box_closed_auto,actor_id.neq.${user.id}`)
      .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(limit)
    mineRows = (data ?? []) as unknown as ActRow[]
  }

  // ② 참여자가 아니어도 나에게 온 타겟 알림 — 참여 거절(신청자는 그 상자 멤버가 아니다).
  //    상자 제목은 참여 상자가 아니라 titleMap에 없으니 meta.box_title로 채운다(054에서 RPC가 저장).
  const { data: targetedData } = await supabase
    .from('box_activities')
    .select(ACT_SELECT)
    .eq('target_user_id', user.id)
    .eq('type', 'join_rejected')
    .order('created_at', { ascending: false })
    .limit(limit)
  const targetedRows = (targetedData ?? []) as unknown as ActRow[]

  // 거절 알림의 상자 제목 — 참여 상자가 아니라 titleMap에 없다. 신청은 공개 상자에서 오므로
  // boxes에서 바로 읽는다(참여자 아니어도 can_read_box로 공개 상자는 읽힌다). meta.box_title 의존 없이 채운다.
  const missingTitleIds = [...new Set(targetedRows.map(a => a.box_id).filter(id => !titleMap.has(id)))]
  if (missingTitleIds.length) {
    const { data: boxRows } = await supabase.from('boxes').select('id, title').in('id', missingTitleIds)
    for (const b of (boxRows ?? []) as { id: string; title: string }[]) titleMap.set(b.id, b.title)
  }

  // 병합(중복 id 제거) → 최신순 → limit.
  const byId = new Map<string, ActRow>()
  for (const a of [...mineRows, ...targetedRows]) byId.set(a.id, a)
  const merged = [...byId.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, limit)

  return merged
    .filter(a => {
      const joined = joinedAtMap.get(a.box_id)
      return !joined || new Date(a.created_at) >= joined
    })
    .map(a => {
      const profile = a.profiles
      const lastSeen = lastSeenMap.get(a.box_id)
      const meta = (a.meta ?? {}) as { option_name?: string; vote_type?: string; option_id?: string; mentioned_ids?: string[]; box_title?: string }
      // 댓글에서 나를 언급했으면 '댓글' 대신 '언급' 문구로 리라벨(같은 활동, 사람별 표시).
      const type = a.type === 'comment_added' && meta.mentioned_ids?.includes(user.id) ? 'mentioned' : a.type
      return {
        id: a.id,
        boxId: a.box_id,
        boxTitle: titleMap.get(a.box_id) ?? meta.box_title ?? '상자',
        optionId: meta.option_id ?? null,
        type,
        actorId: a.actor_id ?? '',
        actorNickname: profile?.nickname ?? '누군가',
        meta,
        createdAt: a.created_at,
        // 참여 상자면 상자별 last_seen, 아니면(거절 등 타겟 알림) 개인 alerts_seen_at 기준.
        unseen: lastSeen ? new Date(a.created_at) > lastSeen : (!alertsSeenAt || new Date(a.created_at) > alertsSeenAt),
        joinStatus: a.type === 'join_requested' ? (joinStatusMap.get(`${a.box_id}:${a.actor_id}`) ?? 'pending') : undefined,
      }
    })
}

/** 타겟 알림(참여 거절 등 — 참여 상자가 아닌 알림) 읽음 처리 — 개인 alerts_seen_at을 now로(055).
 *  상자 단위 markBoxSeen으로는 못 지우는(참여자 아님) 알림을 위해 개인 timestamp를 갱신한다. */
export async function markAlertsSeen(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('profiles') as any).update({ alerts_seen_at: new Date().toISOString() }).eq('id', user.id)
}

/** 한 상자의 알림을 읽음 처리 — 그 상자 last_seen_at을 now로. (seen은 상자 단위) */
export async function markBoxSeen(boxId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('box_participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('box_id', boxId)
    .eq('user_id', user.id)
}
