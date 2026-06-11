import { createClient } from '@/lib/supabase/client'

export interface CommentWithProfile {
  id: string
  option_id: string
  user_id: string
  body: string
  created_at: string
  profiles: { id: string; nickname: string; avatar_url: string | null } | null
}

export async function getComments(optionId: string): Promise<CommentWithProfile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(id, nickname, avatar_url)')
    .eq('option_id', optionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as unknown as CommentWithProfile[]
}

export async function createComment(optionId: string, body: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: option } = await supabase.from('options').select('box_id').eq('id', optionId).single()
  if (!option) throw new Error('Option not found')

  const now = new Date().toISOString()
  const [{ error }] = await Promise.all([
    supabase.from('comments').insert({ option_id: optionId, user_id: user.id, body }),
    // 다른 참여자에겐 shaking 트리거
    supabase.from('boxes').update({ updated_at: now }).eq('id', option.box_id),
    // 본인은 방금 봤으므로 last_seen_at 갱신 (본인 shaking 방지)
    supabase.from('box_participants').update({ last_seen_at: now }).eq('box_id', option.box_id).eq('user_id', user.id),
  ])
  if (error) throw error
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
