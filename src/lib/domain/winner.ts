export interface OptionVoteSummary {
  name: string
  like: number
  dislike: number
}

export interface VoteResult {
  winner: string | null // 유일한 1등. 동점·무투표면 null
  coLeaders: string[] // 공동 1등 이름들 (2개 이상일 때만 채워짐 — 재투표 제안 판단용)
  hasVotes: boolean
}

export function getVoteResult(options: OptionVoteSummary[]): VoteResult {
  if (options.length === 0) return { winner: null, coLeaders: [], hasVotes: false }
  const hasVotes = options.some(o => o.like > 0 || o.dislike > 0)
  if (!hasVotes) return { winner: null, coLeaders: [], hasVotes: false }

  const scored = options.map(o => ({ name: o.name, score: o.like - o.dislike }))
  const maxScore = Math.max(...scored.map(o => o.score))
  const leaders = scored.filter(o => o.score === maxScore).map(o => o.name)
  if (leaders.length === 1) return { winner: leaders[0], coLeaders: [], hasVotes: true }
  return { winner: null, coLeaders: leaders, hasVotes: true }
}

export function getWinner(options: OptionVoteSummary[]): string | null {
  return getVoteResult(options).winner
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
      dislike: roundVotes.filter(v => v.vote_type === 'dislike').length,
    }
  })
}
