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

  if (options.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">선택지</h3>
        <p className="text-sm text-gray-400 text-center py-4">아직 선택지가 없어요.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl p-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">선택지</h3>
      <div className="space-y-2">
        {options.map(option => {
          const counts = votes[option.id] ?? { like: 0, dislike: 0, myVote: null }
          return (
            <div key={option.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/box/${boxId}/option/${option.id}`}
                  className="flex-1 text-sm font-medium text-gray-900 active:opacity-70"
                >
                  {option.name}
                </Link>
                <Link
                  href={`/box/${boxId}/option/${option.id}`}
                  className="text-xs text-gray-400 shrink-0"
                >
                  자세히 보기
                </Link>
              </div>

              {Array.isArray(option.summary) && (option.summary as { text: string }[]).length > 0 && (
                <ul className="space-y-0.5">
                  {(option.summary as { text: string; order: number }[])
                    .sort((a, b) => a.order - b.order)
                    .map((item, i) => (
                      <li key={i} className="text-xs text-gray-500 flex gap-1.5">
                        <span className="text-gray-300">•</span>
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
    </div>
  )
}
