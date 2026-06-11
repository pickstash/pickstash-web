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
  deadline_at: string
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
    .gte('deadline_at', new Date().toISOString())
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
  const { error } = await supabase
    .from('boxes')
    .update({ closed_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
