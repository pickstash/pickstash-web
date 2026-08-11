'use client'

import { useState } from 'react'
import { AppLink } from '@/lib/nav/nav'
import { useOptions, useToggleOptionChecked } from '@/hooks/use-options'
import { useBoxVotes } from '@/hooks/use-votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { useRealtimeOptions } from '@/hooks/use-realtime-options'
import { useInfiniteReveal } from '@/hooks/use-infinite-reveal'
import { sortOptions, groupOptions, OPTION_SORT_MODES, OPTION_SORT_LABELS, type OptionSortMode } from '@/lib/domain/option-sort'
import { parseBlocks, getOptionPreview } from '@/lib/domain/option-content'
import { getLeaderKey } from '@/lib/domain/winner'
import { proxiedImageUrl } from '@/lib/api/unfurl'
import { VoteButtons } from './vote-buttons'
import { Icon } from './icon'
import type { Option, OptionWithCounts } from '@/lib/api/options'

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
  /** 체크형 상자(§033) — 좋아요·1위·결정 대신 체크박스+그룹으로 렌더 */
  checklist?: boolean
}

export function OptionsSection({ boxId, round, initialOptions, canVote, showLikes = true, linksHref, checklist = false }: OptionsSectionProps) {
  const { data: options = initialOptions } = useOptions(boxId)
  const { data: votes = {} } = useBoxVotes(boxId, round)
  const [sortMode, setSortMode] = useState<OptionSortMode>('latest')
  const toggleChecked = useToggleOptionChecked(boxId)

  useRealtimeVotes(boxId, round)
  useRealtimeOptions(boxId)

  // 체크형은 좋아요 정렬 개념이 없어 그룹(라벨)순으로 고정 정렬한다.
  const sorted = (checklist ? groupOptions(options) : sortOptions(options, votes, sortMode)) as OptionWithCounts[]
  const { visibleCount, sentinelRef, hasMore } = useInfiniteReveal(sorted.length, PAGE_SIZE, checklist ? 'group' : sortMode)
  const visible = sorted.slice(0, visibleCount)

  // '인기' 강조: 좋아요 최다가 단독 + 임계값(2개) 이상일 때만 그 하나. 동점·1개는 강조 없음(참고 신호 취지).
  // 체크형(checklist)은 좋아요/1위 개념이 없어 강조하지 않는다.
  const leaderKey = checklist ? null : getLeaderKey(sorted.map(o => ({ key: o.id, like: votes[o.id]?.like ?? 0 })))
  const leaderIds = new Set<string>(leaderKey ? [leaderKey] : [])

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <h3 className="text-[13.5px] font-extrabold text-ink">{checklist ? '항목' : '선택지'} {options.length}개</h3>
          {linksHref && (
            <AppLink
              href={linksHref}
              className="flex items-center gap-1 rounded-full bg-cream px-2 py-0.5 text-[11px] font-bold text-ink-soft active:bg-line"
            >
              <Icon name="link" size={12} />
              링크
            </AppLink>
          )}
        </div>
        {!checklist && showLikes && options.length > 1 && (
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
        // 빈 상태 = 그 자체가 추가 버튼 (점선 CTA 중복 제거)
        <AppLink
          href={`/box/${boxId}/option/new`}
          className="block rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-10 text-center active:bg-cream"
        >
          <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-butter-tint text-ink">
            <Icon name="plus" size={18} />
          </span>
          <p className="text-[13px] font-bold text-ink">{checklist ? '아직 항목이 없어요' : '아직 선택지가 없어요'}</p>
          <p className="mt-1 text-[12px] text-ink-soft">{checklist ? '담을 항목을 먼저 추가해보세요!' : '떠오르는 후보를 먼저 담아보세요!'}</p>
        </AppLink>
      ) : (
        <div className="space-y-2.5">
          {visible.map((option, i) => {
            const counts = votes[option.id] ?? { like: 0, dislike: 0, myVote: null }
            const preview = getOptionPreview(parseBlocks(option.content))
            const isLead = leaderIds.has(option.id)
            const checked = !!option.checked_at
            const groupLabel = option.group_label?.trim() || null
            const showGroupHeader = checklist && groupLabel && groupLabel !== (visible[i - 1]?.group_label?.trim() || null)
            return (
              <div key={option.id}>
                {showGroupHeader && (
                  <p className="mb-1.5 mt-3 px-0.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-faint first:mt-0">
                    {groupLabel}
                  </p>
                )}
                <div
                  className={`relative rounded-[18px] border p-3.5 ${
                    checklist
                      ? 'border-[#ECEADC] bg-paper'
                      : option.decided_at
                        ? 'border-butter-dark bg-butter-tint'
                        : isLead
                          ? 'border-butter-dark bg-paper'
                          : 'border-[#ECEADC] bg-paper'
                  }`}
                >
                  <AppLink
                    href={`/box/${boxId}/option/${option.id}`}
                    aria-label={option.name}
                    className="absolute inset-0 rounded-[18px]"
                  />

                  <div className="flex items-start gap-3">
                    {checklist && (
                      <button
                        type="button"
                        onClick={() => toggleChecked.mutate({ optionId: option.id, checked: !checked })}
                        aria-pressed={checked}
                        aria-label={checked ? '체크 해제' : '체크'}
                        className={`relative z-10 mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] ${
                          checked ? 'border-ink bg-ink text-cream' : 'border-line bg-paper'
                        }`}
                      >
                        {checked && <Icon name="check" size={11} strokeWidth={3} />}
                      </button>
                    )}

                    {/* 왼쪽: (1위/결정 뱃지 — 결정형만) · 이름 · 스니펫(최대 2줄, 체크박스·글머리는 줄바꿈 유지) · 좋아요/댓글 */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        {!checklist && option.decided_at && (
                          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-ink pl-1 pr-1.5 py-0.5 text-[10px] font-extrabold text-cream">
                            <Icon name="check" size={10} strokeWidth={3} />
                            결정
                          </span>
                        )}
                        {!checklist && isLead && showLikes && (
                          <span className="shrink-0 rounded-md bg-butter px-1.5 py-0.5 text-[10px] font-extrabold text-ink shadow-[0_1px_0_#E3B93A]">
                            인기
                          </span>
                        )}
                        <span className={`min-w-0 truncate text-[14.5px] font-extrabold ${checked ? 'text-ink-faint line-through' : 'text-ink'}`}>
                          {option.name}
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        {/* 체크박스·글머리 항목은 줄바꿈 보존(whitespace-pre-line) + 최대 2줄로 잘림(line-clamp-2) */}
                        <p className="line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
                          {preview.snippet || ' '}
                        </p>
                        {preview.memo && (
                          <p className="flex items-center gap-1 text-[11px] leading-relaxed text-ink-faint">
                            <Icon name="edit" size={11} className="shrink-0" />
                            <span className="truncate">{preview.memo}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {!checklist && showLikes && (
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
                        {(option.comment_count ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-faint">
                            <Icon name="comment" size={12} />
                            {option.comment_count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 오른쪽: 56px 썸네일 (없으면 플레이스홀더로 공간 유지) */}
                    {preview.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proxiedImageUrl(preview.image)}
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
              </div>
            )
          })}
          {hasMore && <div key={visibleCount} ref={sentinelRef} aria-hidden className="h-1" />}
        </div>
      )}
    </section>
  )
}
