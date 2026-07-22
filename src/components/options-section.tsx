'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useOptions } from '@/hooks/use-options'
import { useBoxVotes } from '@/hooks/use-votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { useInfiniteReveal } from '@/hooks/use-infinite-reveal'
import { sortOptions, OPTION_SORT_MODES, OPTION_SORT_LABELS, type OptionSortMode } from '@/lib/domain/option-sort'
import { parseBlocks, getOptionPreview } from '@/lib/domain/option-content'
import { VoteButtons } from './vote-buttons'
import type { Option } from '@/lib/api/options'

const PAGE_SIZE = 6

interface OptionsSectionProps {
  boxId: string
  round: number
  initialOptions: Option[]
  canVote: boolean
}

export function OptionsSection({ boxId, round, initialOptions, canVote }: OptionsSectionProps) {
  const { data: options = initialOptions } = useOptions(boxId)
  const { data: votes = {} } = useBoxVotes(boxId, round)
  const [sortMode, setSortMode] = useState<OptionSortMode>('latest')

  useRealtimeVotes(boxId, round)

  const sorted = sortOptions(options, votes, sortMode)
  const { visibleCount, sentinelRef, hasMore } = useInfiniteReveal(sorted.length, PAGE_SIZE, sortMode)
  const visible = sorted.slice(0, visibleCount)

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <h3 className="text-[13.5px] font-extrabold text-ink">선택지 {options.length}개</h3>
        {options.length > 1 && (
          <div className="flex items-center gap-0.5 rounded-full bg-[#EDEBDD] p-0.5">
            {OPTION_SORT_MODES.map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                aria-pressed={sortMode === mode}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-bold transition-colors ${
                  sortMode === mode ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft active:text-ink'
                }`}
              >
                {OPTION_SORT_LABELS[mode]}
              </button>
            ))}
          </div>
        )}
      </div>

      {options.length === 0 ? (
        <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-10 text-center">
          <p className="text-[13px] font-bold text-ink">아직 선택지가 없어요</p>
          <p className="mt-1 text-[12px] text-ink-soft">떠오르는 후보를 먼저 담아보세요!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map(option => {
            const counts = votes[option.id] ?? { like: 0, dislike: 0, myVote: null }
            const preview = getOptionPreview(parseBlocks(option.content))
            return (
              <div key={option.id} className="space-y-2.5 rounded-[18px] border border-[#ECEADC] bg-paper p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/box/${boxId}/option/${option.id}`}
                    className="min-w-0 flex-1 truncate text-[14.5px] font-extrabold text-ink active:opacity-70"
                  >
                    {option.name}
                  </Link>
                  <Link
                    href={`/box/${boxId}/option/${option.id}`}
                    className="shrink-0 text-[10.5px] font-semibold text-ink-faint"
                  >
                    자세히 ›
                  </Link>
                </div>

                {preview.image && (
                  <Link href={`/box/${boxId}/option/${option.id}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview.image}
                      alt={`${option.name} 사진`}
                      className="h-24 w-24 shrink-0 rounded-[14px] border border-line object-cover"
                    />
                  </Link>
                )}

                {preview.snippet && (
                  <p className="line-clamp-2 text-xs leading-relaxed text-ink-soft">{preview.snippet}</p>
                )}

                <VoteButtons
                  optionId={option.id}
                  boxId={boxId}
                  round={round}
                  counts={counts}
                  disabled={!canVote}
                />
              </div>
            )
          })}
          {hasMore && <div key={visibleCount} ref={sentinelRef} aria-hidden className="h-1" />}
        </div>
      )}
    </section>
  )
}
