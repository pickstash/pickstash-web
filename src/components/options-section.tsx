'use client'

import Link from 'next/link'
import { useOptions } from '@/hooks/use-options'
import { useBoxVotes } from '@/hooks/use-votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { VoteButtons } from './vote-buttons'
import type { Option } from '@/lib/api/options'

interface OptionsSectionProps {
  boxId: string
  round: number
  initialOptions: Option[]
  canVote: boolean
}

export function OptionsSection({ boxId, round, initialOptions, canVote }: OptionsSectionProps) {
  const { data: options = initialOptions } = useOptions(boxId)
  const { data: votes = {} } = useBoxVotes(boxId, round)

  useRealtimeVotes(boxId, round)

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between px-0.5">
        <h3 className="text-[13.5px] font-extrabold text-ink">선택지 {options.length}개</h3>
      </div>

      {options.length === 0 ? (
        <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-10 text-center">
          <p className="text-[13px] font-bold text-ink">아직 선택지가 없어요</p>
          <p className="mt-1 text-[12px] text-ink-soft">떠오르는 후보를 먼저 담아보세요!</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {options.map(option => {
            const counts = votes[option.id] ?? { like: 0, dislike: 0, myVote: null }
            const summary = Array.isArray(option.summary)
              ? ([...(option.summary as { text: string; order: number }[])].sort((a, b) => a.order - b.order))
              : []
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

                {summary.length > 0 && (
                  <ul className="space-y-0.5">
                    {summary.map((item, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-ink-soft">
                        <span className="text-[#DBD8C6]">—</span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
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
        </div>
      )}
    </section>
  )
}
