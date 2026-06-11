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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          counts.myVote === 'like'
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 text-gray-500 active:bg-gray-200'
        }`}
      >
        <span>👍</span>
        <span>{counts.like}</span>
      </button>

      <button
        onClick={() => handleVote('dislike')}
        disabled={disabled || vote.isPending}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          counts.myVote === 'dislike'
            ? 'bg-red-100 text-red-500'
            : 'bg-gray-100 text-gray-500 active:bg-gray-200'
        }`}
      >
        <span>👎</span>
        <span>{counts.dislike}</span>
      </button>
    </div>
  )
}
