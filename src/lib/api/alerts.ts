import { createClient } from '@/lib/supabase/client'

export interface AlertItem {
  id: string
  boxId: string
  boxTitle: string
  optionId: string | null // 있으면 그 선택지 상세까지 이동(026 이후 활동)
  type: string
  actorNickname: string
  meta: { option_name?: string; vote_type?: string }
  createdAt: string
  unseen: boolean
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
    .select('box_id, last_seen_at, boxes(id, title)')
    .eq('user_id', user.id)
  if (!participants?.length) return []

  const boxIds = participants.map(p => p.box_id)
  const titleMap = new Map(
    participants.map(p => [p.box_id, (p.boxes as unknown as { title?: string } | null)?.title ?? '상자']),
  )
  const lastSeenMap = new Map(participants.map(p => [p.box_id, new Date(p.last_seen_at)]))

  const { data: activities } = await supabase
    .from('box_activities')
    .select('id, box_id, type, meta, created_at, target_user_id, profiles:actor_id(nickname)')
    .in('box_id', boxIds)
    .neq('actor_id', user.id)
    // 타겟 알림(초대 등)은 대상 본인만, 공용 활동(target 없음)은 참여자 전부.
    .or(`target_user_id.is.null,target_user_id.eq.${user.id}`)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (activities ?? []).map(a => {
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
      actorNickname: profile?.nickname ?? '누군가',
      meta,
      createdAt: a.created_at,
      unseen: !lastSeen || new Date(a.created_at) > lastSeen,
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
