export interface OptionVoteSummary {
  name: string
  like: number
}

export interface VoteResult {
  winner: string | null // 유일한 1등. 동점·무투표면 null
  coLeaders: string[] // 공동 1등 이름들 (2개 이상일 때만 채워짐 — 재투표 제안 판단용)
  hasVotes: boolean
}

export function getVoteResult(options: OptionVoteSummary[]): VoteResult {
  if (options.length === 0) return { winner: null, coLeaders: [], hasVotes: false }
  const hasVotes = options.some(o => o.like > 0)
  if (!hasVotes) return { winner: null, coLeaders: [], hasVotes: false }

  const scored = options.map(o => ({ name: o.name, score: o.like }))
  const maxScore = Math.max(...scored.map(o => o.score))
  const leaders = scored.filter(o => o.score === maxScore).map(o => o.name)
  if (leaders.length === 1) return { winner: leaders[0], coLeaders: [], hasVotes: true }
  return { winner: null, coLeaders: leaders, hasVotes: true }
}

export function getWinner(options: OptionVoteSummary[]): string | null {
  return getVoteResult(options).winner
}

/**
 * 목록에서 1위로 강조할 항목의 key를 반환한다. 득점 = 좋아요 수.
 * 무투표이거나 공동 1위면 null (아무도 강조하지 않음).
 */
export function getLeaderKey<T extends { key: string; like: number }>(
  items: T[],
): string | null {
  const hasVotes = items.some(i => i.like > 0)
  if (!hasVotes) return null
  const scored = items.map(i => ({ key: i.key, score: i.like }))
  const max = Math.max(...scored.map(s => s.score))
  const leaders = scored.filter(s => s.score === max)
  return leaders.length === 1 ? leaders[0].key : null
}

export function buildOptionVoteSummaries(
  options: { name: string; votes: { vote_type: string; round: number }[] }[],
  round: number
): OptionVoteSummary[] {
  return options.map(opt => {
    const roundVotes = opt.votes.filter(v => v.round === round)
    return {
      name: opt.name,
      like: roundVotes.filter(v => v.vote_type === 'like').length,
    }
  })
}
