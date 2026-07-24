'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useOptions } from '@/hooks/use-options'
import { useBoxVotes } from '@/hooks/use-votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { useInfiniteReveal } from '@/hooks/use-infinite-reveal'
import { sortOptions, OPTION_SORT_MODES, OPTION_SORT_LABELS, type OptionSortMode } from '@/lib/domain/option-sort'
import { parseBlocks, getOptionPreview } from '@/lib/domain/option-content'
import { getLeaderKey } from '@/lib/domain/winner'
import { VoteButtons } from './vote-buttons'
import { Icon } from './icon'
import type { Option } from '@/lib/api/options'

const PAGE_SIZE = 6

interface OptionsSectionProps {
  boxId: string
  round: number
  initialOptions: Option[]
  canVote: boolean
  /** 좋아요(선호 표시) 노출 여부 — 혼자 상자는 false */
  showLikes?: boolean
  /** 있으면 '선택지 N개' 옆에 링크 모아보기 칩 표시 */
  linksHref?: string
}

export function OptionsSection({ boxId, round, initialOptions, canVote, showLikes = true, linksHref }: OptionsSectionProps) {
  const { data: options = initialOptions } = useOptions(boxId)
  const { data: votes = {} } = useBoxVotes(boxId, round)
  const [sortMode, setSortMode] = useState<OptionSortMode>('latest')

  useRealtimeVotes(boxId, round)

  const sorted = sortOptions(options, votes, sortMode)
  const { visibleCount, sentinelRef, hasMore } = useInfiniteReveal(sorted.length, PAGE_SIZE, sortMode)
  const visible = sorted.slice(0, visibleCount)

  // 1위 강조: 선택지가 2개 이상일 때만, 좋아요 단독 최다인 항목
  const leaderId =
    sorted.length > 1
      ? getLeaderKey(
          sorted.map(o => {
            const c = votes[o.id] ?? { like: 0, dislike: 0, myVote: null }
            return { key: o.id, like: c.like }
          }),
        )
      : null

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <h3 className="text-[13.5px] font-extrabold text-ink">선택지 {options.length}개</h3>
          {linksHref && (
            <Link
              href={linksHref}
              className="flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold text-ink-soft active:bg-line"
            >
              <Icon name="link" size={12} />
              링크
            </Link>
          )}
        </div>
        {showLikes && options.length > 1 && (
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
            const isLead = option.id === leaderId
            return (
              <div
                key={option.id}
                className={`relative rounded-[18px] border p-3.5 ${
                  option.decided_at
                    ? 'border-butter-dark bg-butter-tint'
                    : isLead
                      ? 'border-butter-dark bg-paper'
                      : 'border-[#ECEADC] bg-paper'
                }`}
              >
                <Link
                  href={`/box/${boxId}/option/${option.id}`}
                  aria-label={option.name}
                  className="absolute inset-0 rounded-[18px]"
                />

                <div className="flex items-start gap-3">
                  {/* 왼쪽: (1위) · 이름 · 스니펫(항상 1줄) · 좋아요 */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      {option.decided_at ? (
                        <span className="shrink-0 rounded-md bg-leaf-tint px-1.5 py-0.5 text-[10px] font-extrabold text-[#37714A]">
                          결정
                        </span>
                      ) : isLead && showLikes && (
                        <span className="shrink-0 rounded-md bg-butter-tint px-1.5 py-0.5 text-[10px] font-extrabold text-butter-dark">
                          1위
                        </span>
                      )}
                      <span className="min-w-0 truncate text-[14.5px] font-extrabold text-ink">
                        {option.name}
                      </span>
                    </div>

                    <p className="truncate text-xs leading-relaxed text-ink-soft">
                      {preview.snippet || ' '}
                    </p>

                    {showLikes && (
                      <div className="relative z-10 w-fit">
                        <VoteButtons
                          optionId={option.id}
                          boxId={boxId}
                          round={round}
                          counts={counts}
                          disabled={!canVote}
                          compact
                        />
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 56px 썸네일 (없으면 플레이스홀더로 공간 유지) */}
                  {preview.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={preview.image}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-[12px] border border-line object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] border border-line bg-cream text-ink-faint"
                      aria-hidden
                    >
                      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {hasMore && <div key={visibleCount} ref={sentinelRef} aria-hidden className="h-1" />}
        </div>
      )}
    </section>
  )
}
