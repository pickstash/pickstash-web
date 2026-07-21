import { createClient } from '@/lib/supabase/client'

export interface VoteCount {
  like: number
  dislike: number
  myVote: 'like' | 'dislike' | null
}

export async function getBoxVotes(boxId: string, round: number): Promise<Record<string, VoteCount>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: options } = await supabase
    .from('options')
    .select('id')
    .eq('box_id', boxId)

  if (!options || options.length === 0) return {}

  const optionIds = options.map(o => o.id)

  const { data: votes } = await supabase
    .from('votes')
    .select('option_id, user_id, vote_type')
    .in('option_id', optionIds)
    .eq('round', round)

  const result: Record<string, VoteCount> = {}
  for (const option of options) {
    const optionVotes = votes?.filter(v => v.option_id === option.id) ?? []
    result[option.id] = {
      like: optionVotes.filter(v => v.vote_type === 'like').length,
      dislike: optionVotes.filter(v => v.vote_type === 'dislike').length,
      myVote: (optionVotes.find(v => v.user_id === user.id)?.vote_type ?? null) as 'like' | 'dislike' | null,
    }
  }

  return result
}

export async function upsertVote(optionId: string, voteType: 'like' | 'dislike', round: number): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('votes').upsert(
    { option_id: optionId, user_id: user.id, vote_type: voteType, round },
    { onConflict: 'option_id,user_id,round' }
  )
  if (error) throw error

  // 활동 기록은 DB 트리거가 수행. 내 목록에 NEW가 뜨지 않게 본인 last_seen_at만 갱신
  const { data: option } = await supabase.from('options').select('box_id').eq('id', optionId).single()
  if (option) {
    await supabase
      .from('box_participants')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('box_id', option.box_id)
      .eq('user_id', user.id)
  }
}

export async function deleteVote(optionId: string, round: number): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('votes')
    .delete()
    .eq('option_id', optionId)
    .eq('user_id', user.id)
    .eq('round', round)
  if (error) throw error
}
