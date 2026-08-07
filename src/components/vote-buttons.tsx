'use client'

import { useState } from 'react'
import { useVote } from '@/hooks/use-votes'
import { useOptionLikers } from '@/hooks/use-likers'
import { useLongPress } from '@/lib/use-long-press'
import { LikersSheet } from '@/components/likers-sheet'
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

  // 꾸욱(롱프레스) → 누가 좋아요 했는지 명단 시트. 시트 열릴 때만 조회.
  const [sheetOpen, setSheetOpen] = useState(false)
  const likers = useOptionLikers(optionId, round, sheetOpen)
  const lp = useLongPress(() => {
    if (counts.like > 0) setSheetOpen(true)
  })

  function handleLike() {
    if (lp.suppressClick()) return // 롱프레스로 시트를 연 클릭은 토글하지 않는다
    if (disabled || vote.isPending) return
    vote.mutate({ optionId, voteType: 'like', currentMyVote: counts.myVote })
  }

  const size = compact ? 'px-2.5 py-1 text-[12.5px]' : 'px-3.5 py-1.5 text-[13.5px]'
  const state = liked
    ? 'border-butter-dark bg-butter-tint text-ink'
    : 'border-line bg-transparent text-ink-soft active:bg-cream'

  return (
    <>
      <button
        onClick={handleLike}
        {...lp.handlers}
        disabled={disabled || vote.isPending}
        className={`flex w-fit select-none items-center gap-1.5 rounded-full border font-bold transition-colors disabled:opacity-45 ${size} ${state}`}
      >
        <Icon name="heart" filled={liked} size={compact ? 15 : 16} className={liked ? 'text-butter-dark' : undefined} />
        <span className="tabular-nums">{counts.like}</span>
      </button>

      <LikersSheet
        open={sheetOpen}
        title="이 선택지를 좋아해요"
        likers={likers.data ?? []}
        isLoading={likers.isLoading}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}
