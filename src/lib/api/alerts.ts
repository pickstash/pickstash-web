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
export async function getAlerts(limit = 100): Promise<AlertItem[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: participants } = await supabase
    .from('box_participants')
    .select('box_id, last_seen_at, joined_at, boxes(id, title)')
    .eq('user_id', user.id)
  if (!participants?.length) return []

  const boxIds = participants.map(p => p.box_id)
  const titleMap = new Map(
    participants.map(p => [p.box_id, (p.boxes as unknown as { title?: string } | null)?.title ?? '상자']),
  )
  const lastSeenMap = new Map(participants.map(p => [p.box_id, new Date(p.last_seen_at)]))
  // 초대/가입 이전 활동은 알림에서 제외 — 새로 참여한 사람에게 상자의 과거 내역이 쏟아지지 않게.
  const joinedAtMap = new Map(
    participants.map(p => {
      const j = (p as unknown as { joined_at: string | null }).joined_at
      return [p.box_id, j ? new Date(j) : null] as const
    }),
  )

  // 참여 신청 처리 상태 — join_requested 항목을 pending/처리됨으로 구분(046). RLS: 참여자는 조회 가능.
  // join_requests는 types.ts 미갱신 테이블 — 저장소 관례대로 캐스팅(listJoinRequests와 동일).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reqData } = await (supabase.from('join_requests' as any) as any)
    .select('box_id, user_id, status')
    .in('box_id', boxIds)
  const reqRows = (reqData ?? []) as { box_id: string; user_id: string; status: 'pending' | 'approved' | 'rejected' }[]
  const joinStatusMap = new Map(reqRows.map(r => [`${r.box_id}:${r.user_id}`, r.status]))

  const { data: activities } = await supabase
    .from('box_activities')
    .select('id, box_id, type, meta, created_at, target_user_id, actor_id, profiles:actor_id(nickname)')
    .in('box_id', boxIds)
    // 내 활동은 제외 — 단 자동마감(box_closed_auto)은 시스템 이벤트라 actor(첫 참여자=보통 만든이)
    // 무관하게 전원에게 노출한다(안 그러면 만든 사람이 자기 상자 자동정리를 못 봄).
    .or(`type.eq.box_closed_auto,actor_id.neq.${user.id}`)
    // 타겟 알림(초대 등)은 대상 본인만, 공용 활동(target 없음)은 참여자 전부.
    .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (activities ?? [])
    .filter(a => {
      const joined = joinedAtMap.get(a.box_id)
      return !joined || new Date(a.created_at) >= joined
    })
    .map(a => {
    const profile = a.profiles as unknown as { nickname: string } | null
    const lastSeen = lastSeenMap.get(a.box_id)
    const meta = (a.meta ?? {}) as { option_name?: string; vote_type?: string; option_id?: string; mentioned_ids?: string[] }
    // 댓글에서 나를 언급했으면 '댓글' 대신 '언급' 문구로 리라벨(같은 활동, 사람별 표시).
    const type = a.type === 'comment_added' && meta.mentioned_ids?.includes(user.id) ? 'mentioned' : a.type
    return {
      id: a.id,
      boxId: a.box_id,
      boxTitle: titleMap.get(a.box_id) ?? '상자',
      optionId: meta.option_id ?? null,
      type,
      actorId: a.actor_id ?? '',
      actorNickname: profile?.nickname ?? '누군가',
      meta,
      createdAt: a.created_at,
      unseen: !lastSeen || new Date(a.created_at) > lastSeen,
      joinStatus: a.type === 'join_requested' ? (joinStatusMap.get(`${a.box_id}:${a.actor_id}`) ?? 'pending') : undefined,
    }
  })
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
