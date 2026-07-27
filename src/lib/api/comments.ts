import { createClient } from '@/lib/supabase/client'
import { extractMentionedUserIds } from '@/lib/domain/mentions'

export interface CommentWithProfile {
  id: string
  option_id: string
  user_id: string
  body: string
  parent_comment_id: string | null
  edited_at: string | null
  created_at: string
  profiles: { id: string; nickname: string; avatar_url: string | null } | null
}

export interface CommentLikeCount {
  count: number
  likedByMe: boolean
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

export async function createComment(
  optionId: string,
  body: string,
  opts?: { parentCommentId?: string },
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: option } = await supabase.from('options').select('box_id').eq('id', optionId).single()
  if (!option) throw new Error('Option not found')

  // 활동 기록·updated_at 갱신은 DB 트리거가 수행 (004_replan.sql)
  const now = new Date().toISOString()
  const [{ error }] = await Promise.all([
    supabase.from('comments').insert({
      option_id: optionId,
      user_id: user.id,
      body,
      parent_comment_id: opts?.parentCommentId ?? null,
    }),
    // 본인은 방금 봤으므로 last_seen_at 갱신 (내 목록 NEW 방지)
    supabase.from('box_participants').update({ last_seen_at: now }).eq('box_id', option.box_id).eq('user_id', user.id),
  ])
  if (error) throw error

  // 다른 참여자에게 push 알림 (실패해도 무시)
  supabase.functions.invoke('send-push', {
    body: { box_id: option.box_id, triggered_by: user.id },
  }).catch(() => {})

  // @멘션된 사람에게 별도 타겟 알림
  const mentionedUserIds = extractMentionedUserIds(body)
  if (mentionedUserIds.length > 0) {
    supabase.functions.invoke('send-push', {
      body: { box_id: option.box_id, triggered_by: user.id, target_user_ids: mentionedUserIds, message_key: 'mention' },
    }).catch(() => {})
  }
}

export async function updateComment(id: string, body: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('comments').update({ body }).eq('id', id)
  if (error) throw error
}

export async function deleteComment(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('comments').delete().eq('id', id)
  if (error) throw error
}

export async function getCommentLikes(optionId: string): Promise<Record<string, CommentLikeCount>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: comments } = await supabase.from('comments').select('id').eq('option_id', optionId)
  const commentIds = (comments ?? []).map(c => c.id)
  if (commentIds.length === 0) return {}

  const { data: likes, error } = await supabase
    .from('comment_likes')
    .select('comment_id, user_id')
    .in('comment_id', commentIds)
  if (error) throw error

  const result: Record<string, CommentLikeCount> = {}
  for (const like of likes ?? []) {
    const cur = result[like.comment_id] ?? { count: 0, likedByMe: false }
    cur.count += 1
    if (like.user_id === user?.id) cur.likedByMe = true
    result[like.comment_id] = cur
  }
  return result
}

export async function likeComment(commentId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: user.id })
  if (error) throw error
}

export async function unlikeComment(commentId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('comment_likes')
    .delete()
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
  if (error) throw error
}
