import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import { sendPush } from '@/lib/api/push'

export type Box = Database['public']['Tables']['boxes']['Row']

export interface BoxParticipant {
  user_id: string
  joined_at: string
  last_seen_at: string
  profiles: {
    id: string
    nickname: string
    avatar_url: string | null
  } | null
}

export interface BoxWithParticipants extends Box {
  box_participants: BoxParticipant[]
}

export type DecisionMode = 'manual' | 'auto_deadline'

export interface CreateBoxInput {
  title: string
  memo?: string
  decision_mode: DecisionMode          // 직접 정하기 / 마감 투표
  deadline_at: string | null           // auto_deadline일 때만 값, manual이면 null
}

export async function createBox(input: CreateBoxInput): Promise<Box> {
  const supabase = createClient()

  // 상자 + 생성자 참여자 행을 원자적으로 생성한다 (RPC).
  // 직접 .insert().select() 하면 INSERT ... RETURNING이 boxes의 SELECT 정책(EXISTS box_participants)을
  // 타는데, 이 시점엔 참여자 행이 없어 42501("violates RLS")로 실패한다. RPC 안에서 참여자까지 넣고 조회해 반환.
  const { data: box, error } = await supabase.rpc('create_box', {
    p_title: input.title,
    p_memo: input.memo ?? null,
    p_decision_mode: input.decision_mode,
    p_deadline_at: input.decision_mode === 'auto_deadline' ? input.deadline_at : null,
  })

  if (error) throw error
  if (!box) throw new Error('상자 생성에 실패했어요.')
  return box as Box
}

export async function getBox(id: string): Promise<BoxWithParticipants | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('boxes')
    .select(`
      *,
      box_participants(
        user_id, joined_at, last_seen_at,
        profiles(id, nickname, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as unknown as BoxWithParticipants
}

export async function getMessyBoxes(): Promise<Box[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('boxes')
    .select('*')
    .is('closed_at', null)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function updateBoxTitle(id: string, title: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('boxes')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function updateBoxDeadline(id: string, deadline_at: string | null): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('boxes')
    .update({ deadline_at, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** 결정 방식 변경 (참여자 누구나). 마감 투표면 deadline_at 필수, 직접 정하기면 마감 제거. */
export async function updateBoxDecisionMode(id: string, mode: DecisionMode, deadline_at: string | null): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('boxes')
    .update({
      decision_mode: mode,
      deadline_at: mode === 'auto_deadline' ? deadline_at : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function updateBoxMemo(id: string, memo: string | null): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('boxes')
    .update({ memo, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

/** 결정: 선택한 선택지(들)를 결정으로 표시 + 정리완료 (참여자 누구나). optionIds는 1개 이상. */
export async function decideBox(id: string, optionIds: string[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('decide_box', { p_box_id: id, p_option_ids: optionIds })
  if (error) throw error

  // 결정 확정은 참여자에게 푸시
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    sendPush({ box_id: id, triggered_by: user.id, message_key: 'decision' })
  }
}

/** 번복(다시 정리하기): 정리완료·결정 표시 해제 → 정리중 */
export async function reopenBox(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reopen_box', { p_box_id: id })
  if (error) throw error
}

/** 마감 투표 자동 결정 (lazy commit용). 조건 안 맞으면 서버에서 no-op. */
export async function autoDecideBox(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('auto_decide_box', { p_box_id: id })
  if (error) throw error
  // 자동마감 푸시는 DB 트리거(034)가 box_closed_auto 활동 insert 시 send-push로 전담한다
  // → lazy(여기)·크론(SQL) 양쪽 경로 통합. 여기서 또 보내면 lazy 경로가 중복 발송된다.
}

export async function deleteBox(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('boxes').delete().eq('id', id)
  if (error) throw error
}

/** 참여자가 상자에서 나가기 — 본인 참여 행만 삭제 (RLS: box_participants 본인 삭제). 마지막 1명이 나가면 트리거가 상자 자동 삭제. */
export async function leaveBox(id: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('box_participants')
    .delete()
    .eq('box_id', id)
    .eq('user_id', user.id)
  if (error) throw error
  // 나가면 이 상자는 내 모든 목록(RLS)에서 사라지므로 즐겨찾기도 정리한다.
  // (안 지우면 홈 '즐겨찾는 창고' 카운트엔 잡히는데 목록엔 안 떠 불일치.)
  // 마지막 참여자였다면 상자 cascade로 이미 삭제됐을 수 있어 이 delete는 무해한 no-op.
  await supabase.from('favorites').delete().eq('box_id', id).eq('user_id', user.id)
}

export async function markAllSeen(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('box_participants')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', user.id)
}

export interface ShakingBox {
  box: Box
  /** 내 마지막 확인 이후 다른 참여자의 최신 활동 (표시용) */
  latestActivity: {
    type: string
    actorNickname: string
    meta: { option_name?: string; vote_type?: string }
  } | null
}

/**
 * 들썩이는 상자 = 내 last_seen_at 이후 "다른 참여자"의 활동이 있는 상자.
 * box_activities 기반이라 내 활동으로 내 상자가 들썩이지 않는다.
 */
export async function getShakingBoxes(): Promise<ShakingBox[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: participants } = await supabase
    .from('box_participants')
    .select('box_id, last_seen_at, boxes(*)')
    .eq('user_id', user.id)

  if (!participants || participants.length === 0) return []

  const boxIds = participants.map(p => p.box_id)
  const { data: activities } = await supabase
    .from('box_activities')
    .select('box_id, type, meta, created_at, profiles:actor_id(nickname)')
    .in('box_id', boxIds)
    .neq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const lastSeenMap = new Map(participants.map(p => [p.box_id, new Date(p.last_seen_at)]))
  const latestUnseen = new Map<string, NonNullable<typeof activities>[number]>()
  for (const a of activities ?? []) {
    const lastSeen = lastSeenMap.get(a.box_id)
    if (!lastSeen || new Date(a.created_at) <= lastSeen) continue
    if (!latestUnseen.has(a.box_id)) latestUnseen.set(a.box_id, a)
  }

  return participants
    .filter(p => p.boxes && latestUnseen.has(p.box_id))
    .map(p => {
      const a = latestUnseen.get(p.box_id)!
      const profile = a.profiles as unknown as { nickname: string } | null
      return {
        box: p.boxes as unknown as Box,
        latestActivity: {
          type: a.type,
          actorNickname: profile?.nickname ?? '누군가',
          meta: (a.meta ?? {}) as { option_name?: string; vote_type?: string },
        },
      }
    })
    .sort((x, y) => new Date(y.box.updated_at).getTime() - new Date(x.box.updated_at).getTime())
}
