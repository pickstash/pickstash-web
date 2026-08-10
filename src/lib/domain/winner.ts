export interface OptionVoteSummary {
  name: string
  like: number
}

export interface VoteResult {
  winner: string | null // 유일한 1등. 동점·무투표면 null
  coLeaders: string[] // 공동 1등 이름들 (2개 이상일 때만 채워짐 — 재투표 제안 판단용)
  hasVotes: boolean
}

// 표시용 '인기'(옛 지금 1위) 인정 임계값 — 좋아요 1개로 즉시 크라운되거나 동점이 우르르 잡히는
// 노이즈를 막는다. 좋아요=참고 신호 취지에 맞게, '확실히 앞설 때만' 강조한다.
// 규칙: 좋아요 최다가 "단독"이고 "2개 이상"일 때만 리더. 동점·1개·무투표는 리더 없음.
export const MIN_LEADER_LIKES = 2

export function getVoteResult(options: OptionVoteSummary[]): VoteResult {
  if (options.length === 0) return { winner: null, coLeaders: [], hasVotes: false }
  const hasVotes = options.some(o => o.like > 0)
  if (!hasVotes) return { winner: null, coLeaders: [], hasVotes: false }

  const scored = options.map(o => ({ name: o.name, score: o.like }))
  const maxScore = Math.max(...scored.map(o => o.score))
  const leaders = scored.filter(o => o.score === maxScore).map(o => o.name)
  // 단독 최다 + 임계값 이상만 인정. 동점(공동)·1개는 표시 안 함(참고 신호 취지).
  if (leaders.length === 1 && maxScore >= MIN_LEADER_LIKES) {
    return { winner: leaders[0], coLeaders: [], hasVotes: true }
  }
  return { winner: null, coLeaders: [], hasVotes: true }
}

export function getWinner(options: OptionVoteSummary[]): string | null {
  return getVoteResult(options).winner
}

/**
 * 목록에서 '인기'로 강조할 항목의 key를 반환한다. 득점 = 좋아요 수.
 * 좋아요 최다가 단독 + 임계값 이상일 때만. 무투표·동점·1개면 null(아무도 강조 안 함).
 */
export function getLeaderKey<T extends { key: string; like: number }>(
  items: T[],
): string | null {
  const hasVotes = items.some(i => i.like > 0)
  if (!hasVotes) return null
  const scored = items.map(i => ({ key: i.key, score: i.like }))
  const max = Math.max(...scored.map(s => s.score))
  if (max < MIN_LEADER_LIKES) return null
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
