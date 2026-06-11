export interface OptionVoteSummary {
  name: string
  like: number
  dislike: number
}

export function getWinner(options: OptionVoteSummary[]): string | null {
  if (options.length === 0) return null
  const hasVotes = options.some(o => o.like > 0 || o.dislike > 0)
  if (!hasVotes) return null

  const scored = options.map(o => ({ name: o.name, score: o.like - o.dislike }))
  const maxScore = Math.max(...scored.map(o => o.score))
  const winners = scored.filter(o => o.score === maxScore)
  if (winners.length !== 1) return null // 동점
  return winners[0].name
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
