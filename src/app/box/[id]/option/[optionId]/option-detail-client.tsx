'use client'

import Link from 'next/link'
import { useState } from 'react'
import { VoteButtons } from '@/components/vote-buttons'
import { useBoxVotes } from '@/hooks/use-votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { useDeleteOption } from '@/hooks/use-options'
import type { Option } from '@/lib/api/options'

interface OptionDetailClientProps {
  option: Option
  boxId: string
  round: number
  isOwner: boolean
  canVote: boolean
}

export function OptionDetailClient({
  option,
  boxId,
  round,
  isOwner,
  canVote,
}: OptionDetailClientProps) {
  const { data: votes = {} } = useBoxVotes(boxId, round)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteOption = useDeleteOption(boxId)

  useRealtimeVotes(boxId, round)

  const counts = votes[option.id] ?? { like: 0, dislike: 0, myVote: null }
  const summary = Array.isArray(option.summary)
    ? (option.summary as { text: string; order: number }[]).sort((a, b) => a.order - b.order)
    : []
  const links = Array.isArray(option.links) ? (option.links as string[]) : []

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href={`/box/${boxId}`} className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">{option.name}</h1>
        {isOwner && (
          <Link
            href={`/box/${boxId}/option/${option.id}/edit`}
            className="text-xs text-blue-500 shrink-0"
          >
            수정
          </Link>
        )}
      </header>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* 투표 */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">투표</h2>
          <VoteButtons
            optionId={option.id}
            boxId={boxId}
            round={round}
            counts={counts}
            disabled={!canVote}
          />
          {!canVote && (
            <p className="text-xs text-gray-400">마감된 상자에서는 투표할 수 없어요.</p>
          )}
        </div>

        {/* 요약 항목 */}
        {summary.length > 0 && (
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">요약</h2>
            <ul className="space-y-1.5">
              {summary.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-gray-300 shrink-0">•</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 메모 */}
        {option.memo && (
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">메모</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{option.memo}</p>
          </div>
        )}

        {/* 링크 */}
        {links.length > 0 && (
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">링크</h2>
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li key={i}>
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 break-all underline"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 삭제 버튼 (방장만) */}
      {isOwner && (
        <div className="px-5 pb-10">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full border border-red-200 text-red-400 py-3.5 rounded-xl text-sm font-medium"
            >
              선택지 삭제
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-sm text-gray-500">정말 삭제하시겠어요?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={() => deleteOption.mutate(option.id)}
                  disabled={deleteOption.isPending}
                  className="flex-1 bg-red-500 text-white py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  삭제하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
