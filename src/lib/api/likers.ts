import { createClient } from '@/lib/supabase/client'

// 좋아요를 누른 사람 명단(프로필 포함) — 선택지 좋아요(votes)·댓글 좋아요(comment_likes) 공용.
// 아키텍처 규칙: 모든 Supabase 접근은 lib/api/*에서만. UI는 훅(use-likers)으로만 접근.
export interface Liker {
  user_id: string
  nickname: string
  avatar_url: string | null
}

// user_id 순서를 유지한 채 프로필을 붙인다(좋아요 누른 순서 = 표시 순서).
async function withProfiles(userIds: string[]): Promise<Liker[]> {
  if (userIds.length === 0) return []
  const supabase = createClient()
  const { data } = await supabase.from('profiles').select('id, nickname, avatar_url').in('id', userIds)
  const byId = new Map((data ?? []).map(p => [p.id, p]))
  return userIds.map(id => {
    const p = byId.get(id)
    return { user_id: id, nickname: p?.nickname ?? '알 수 없음', avatar_url: p?.avatar_url ?? null }
  })
}

export async function getOptionLikers(optionId: string, round: number): Promise<Liker[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('votes')
    .select('user_id, created_at')
    .eq('option_id', optionId)
    .eq('vote_type', 'like')
    .eq('round', round)
    .order('created_at', { ascending: true })
  return withProfiles((data ?? []).map(v => v.user_id))
}

export async function getCommentLikers(commentId: string): Promise<Liker[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('comment_likes')
    .select('user_id, created_at')
    .eq('comment_id', commentId)
    .order('created_at', { ascending: true })
  return withProfiles((data ?? []).map(l => l.user_id))
}
