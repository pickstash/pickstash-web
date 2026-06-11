'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUpdateBoxTitle, useUpdateBoxDeadline } from '@/hooks/use-boxes'
import { DeadlineBottomSheet } from '@/components/deadline-bottom-sheet'
import { getBoxStatus } from '@/lib/domain/box-status'
import { formatKoreanDate, formatKoreanDateTime } from '@/lib/utils'
import type { BoxWithParticipants } from '@/lib/api/boxes'

interface BoxDetailClientProps {
  box: BoxWithParticipants
  isOwner: boolean
  currentUserId: string
}

export function BoxDetailClient({ box: initialBox, isOwner }: BoxDetailClientProps) {
  const [box, setBox] = useState(initialBox)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(box.title)
  const [deadlineSheetOpen, setDeadlineSheetOpen] = useState(false)

  const updateTitle = useUpdateBoxTitle(box.id)
  const updateDeadline = useUpdateBoxDeadline(box.id)

  const status = getBoxStatus(box)

  function handleSaveTitle() {
    if (!titleInput.trim() || titleInput === box.title) {
      setEditingTitle(false)
      setTitleInput(box.title)
      return
    }
    updateTitle.mutate(titleInput.trim(), {
      onSuccess: () => {
        setBox(prev => ({ ...prev, title: titleInput.trim() }))
        setEditingTitle(false)
      },
    })
  }

  function handleDeadlineConfirm(date: Date) {
    const deadline_at = date.toISOString()
    updateDeadline.mutate(deadline_at, {
      onSuccess: () => {
        setBox(prev => ({ ...prev, deadline_at }))
        setDeadlineSheetOpen(false)
      },
    })
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href="/" className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">{box.title}</h1>
      </header>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* 상태 + 제목 */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          {status === 'SHOWDOWN' && (
            <span className="inline-block text-xs font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
              결판 중
            </span>
          )}

          {editingTitle ? (
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                maxLength={50}
                autoFocus
                className="flex-1 border-b border-gray-300 text-base font-semibold py-1 focus:outline-none"
              />
              <button
                onClick={handleSaveTitle}
                disabled={updateTitle.isPending}
                className="text-sm text-blue-500 font-medium shrink-0"
              >
                저장
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">{box.title}</h2>
              {isOwner && (
                <button
                  onClick={() => { setEditingTitle(true); setTitleInput(box.title) }}
                  className="text-xs text-gray-400 shrink-0"
                >
                  수정하기
                </button>
              )}
            </div>
          )}

          {box.memo && <p className="text-sm text-gray-500">{box.memo}</p>}
        </div>

        {/* 날짜 */}
        <div className="bg-white rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">생성일</span>
            <span className="text-gray-700">{formatKoreanDate(box.created_at)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">마감일</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">{formatKoreanDateTime(box.deadline_at)}</span>
              {isOwner && (
                <button
                  onClick={() => setDeadlineSheetOpen(true)}
                  className="text-xs text-blue-500"
                >
                  변경
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 참여자 */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">참여 인원</span>
              <span className="text-sm font-semibold text-gray-900">{box.box_participants.length}명</span>
            </div>
            <Link href={`/box/${box.id}/invite`} className="text-xs text-blue-500">
              + 친구초대
            </Link>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {box.box_participants.map(p => (
              <div key={p.user_id} className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden">
                  {p.profiles?.avatar_url ? (
                    <img src={p.profiles.avatar_url} alt={p.profiles.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                      {p.profiles?.nickname?.[0] ?? '?'}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-600">{p.profiles?.nickname}</span>
                {p.role === 'owner' && <span className="text-xs text-gray-400">(방장)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* 선택지 (2단계에서는 빈 섹션) */}
        <div className="bg-white rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">선택지</h3>
          <p className="text-sm text-gray-400 text-center py-4">아직 선택지가 없어요.</p>
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="px-5 pb-10 space-y-2">
        <Link href={`/box/${box.id}/option/new`}>
          <button className="w-full border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-medium active:bg-gray-50">
            선택지 추가하기
          </button>
        </Link>
      </div>

      <DeadlineBottomSheet
        open={deadlineSheetOpen}
        defaultValue={new Date(box.deadline_at)}
        onClose={() => setDeadlineSheetOpen(false)}
        onConfirm={handleDeadlineConfirm}
      />
    </main>
  )
}
