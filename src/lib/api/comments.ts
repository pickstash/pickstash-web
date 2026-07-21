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

  // 활동 기록·updated_at 갱신은 DB 트리거가 수행 (004_replan.sql)
  const now = new Date().toISOString()
  const [{ error }] = await Promise.all([
    supabase.from('comments').insert({ option_id: optionId, user_id: user.id, body }),
    // 본인은 방금 봤으므로 last_seen_at 갱신 (내 목록 NEW 방지)
    supabase.from('box_participants').update({ last_seen_at: now }).eq('box_id', option.box_id).eq('user_id', user.id),
  ])
  if (error) throw error

  // 다른 참여자에게 push 알림 (실패해도 무시)
  supabase.functions.invoke('send-push', {
    body: { box_id: option.box_id, triggered_by: user.id },
  }).catch(() => {})
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}
