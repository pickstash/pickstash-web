import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Box = Database['public']['Tables']['boxes']['Row']

export interface BoxParticipant {
  user_id: string
  role: string
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

export interface CreateBoxInput {
  title: string
  memo?: string
  deadline_at: string | null // null = 마감 없는 상자 (혼자 고민 보드)
}

export async function createBox(input: CreateBoxInput): Promise<Box> {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: box, error: boxError } = await supabase
    .from('boxes')
    .insert({
      owner_id: user.id,
      title: input.title,
      memo: input.memo ?? null,
      deadline_at: input.deadline_at,
    })
    .select()
    .single()

  if (boxError) throw boxError

  const { error: participantError } = await supabase
    .from('box_participants')
    .insert({ box_id: box.id, user_id: user.id, role: 'owner' })

  if (participantError) throw participantError

  return box
}

export async function getBox(id: string): Promise<BoxWithParticipants | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('boxes')
    .select(`
      *,
      box_participants(
        user_id, role, joined_at, last_seen_at,
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
    .or(`deadline_at.is.null,deadline_at.gte.${new Date().toISOString()}`)
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

export async function updateBoxDeadline(id: string, deadline_at: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('boxes')
    .update({ deadline_at, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function closeBox(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('close_box', { p_box_id: id })
  if (error) throw error

  // 결정 확정은 참여자에게 푸시 (실패 무시)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    supabase.functions.invoke('send-push', {
      body: { box_id: id, triggered_by: user.id },
    }).catch(() => {})
  }
}

export async function reopenBox(id: string, newDeadline?: string | null): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('reopen_box', {
    p_box_id: id,
    p_deadline: newDeadline ?? null,
  })
  if (error) throw error
}

export async function startRematch(id: string, newDeadline: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('start_rematch', {
    p_box_id: id,
    p_deadline: newDeadline,
  })
  if (error) throw error
}

export async function deleteBox(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('boxes').delete().eq('id', id)
  if (error) throw error
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
