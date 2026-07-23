'use client'

import { useVote } from '@/hooks/use-votes'
import type { VoteCount } from '@/lib/api/votes'
import { Icon } from './icon'

interface VoteButtonsProps {
  optionId: string
  boxId: string
  round: number
  counts: VoteCount
  disabled?: boolean
  /** 목록용 경량 스타일(작은 크기) */
  compact?: boolean
}

export function VoteButtons({ optionId, boxId, round, counts, disabled, compact = false }: VoteButtonsProps) {
  const vote = useVote(boxId, round)
  const liked = counts.myVote === 'like'

  function handleLike() {
    if (disabled || vote.isPending) return
    vote.mutate({ optionId, voteType: 'like', currentMyVote: counts.myVote })
  }

  const size = compact ? 'px-2.5 py-1 text-[12.5px]' : 'px-3.5 py-1.5 text-[13.5px]'
  const state = liked
    ? 'border-butter-dark bg-butter-tint text-ink'
    : 'border-line bg-paper text-ink-soft active:bg-cream'

  return (
    <button
      onClick={handleLike}
      disabled={disabled || vote.isPending}
      className={`flex w-fit items-center gap-1.5 rounded-full border font-bold transition-colors disabled:opacity-45 ${size} ${state}`}
    >
      <Icon name="heart" filled={liked} size={compact ? 15 : 16} className={liked ? 'text-butter-dark' : undefined} />
      <span className="tabular-nums">{counts.like}</span>
    </button>
  )
}
