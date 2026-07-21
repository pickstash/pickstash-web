'use client'

import { useVote } from '@/hooks/use-votes'
import type { VoteCount } from '@/lib/api/votes'

interface VoteButtonsProps {
  optionId: string
  boxId: string
  round: number
  counts: VoteCount
  disabled?: boolean
}

export function VoteButtons({ optionId, boxId, round, counts, disabled }: VoteButtonsProps) {
  const vote = useVote(boxId, round)

  function handleVote(voteType: 'like' | 'dislike') {
    if (disabled || vote.isPending) return
    vote.mutate({ optionId, voteType, currentMyVote: counts.myVote })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote('like')}
        disabled={disabled || vote.isPending}
        className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-[13.5px] font-bold transition-colors disabled:opacity-45 ${
          counts.myVote === 'like'
            ? 'border-butter-dark bg-butter-tint text-ink'
            : 'border-line bg-paper text-ink active:bg-cream'
        }`}
      >
        <span>👍</span>
        <span className="tabular-nums">{counts.like}</span>
      </button>

      <button
        onClick={() => handleVote('dislike')}
        disabled={disabled || vote.isPending}
        className={`flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-[13.5px] font-bold transition-colors disabled:opacity-45 ${
          counts.myVote === 'dislike'
            ? 'border-tomato bg-tomato-tint text-[#B4482F]'
            : 'border-line bg-paper text-ink active:bg-cream'
        }`}
      >
        <span>👎</span>
        <span className="tabular-nums">{counts.dislike}</span>
      </button>
    </div>
  )
}
