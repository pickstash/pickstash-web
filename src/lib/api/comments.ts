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
  const { error } = await supabase
    .from('comments')
    .insert({ option_id: optionId, user_id: user.id, body })
  if (error) throw error
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
