'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useUpdateBoxTitle, useUpdateBoxDeadline, useCloseBox, useStartShowdown } from '@/hooks/use-boxes'
import { useToggleFavorite } from '@/hooks/use-favorites'
import { DeadlineBottomSheet } from '@/components/deadline-bottom-sheet'
import { OptionsSection } from '@/components/options-section'
import { getBoxStatus, isDoneStatus } from '@/lib/domain/box-status'
import { formatKoreanDate, formatKoreanDateTime } from '@/lib/utils'
import type { BoxWithParticipants } from '@/lib/api/boxes'
import type { Option } from '@/lib/api/options'

interface BoxDetailClientProps {
  box: BoxWithParticipants
  isOwner: boolean
  currentUserId: string
  initialOptions: Option[]
  initialIsFavorite: boolean
}

export function BoxDetailClient({ box: initialBox, isOwner, initialOptions, initialIsFavorite }: BoxDetailClientProps) {
  const [box, setBox] = useState(initialBox)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(box.title)
  const [deadlineSheetOpen, setDeadlineSheetOpen] = useState(false)
  const [showdownSheetOpen, setShowdownSheetOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)

  const updateTitle = useUpdateBoxTitle(box.id)
  const updateDeadline = useUpdateBoxDeadline(box.id)
  const closeBox = useCloseBox(box.id)
  const startShowdown = useStartShowdown(box.id)
  const toggleFavorite = useToggleFavorite(box.id)

  const status = getBoxStatus(box)
  const isDone = isDoneStatus(status)

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

  function handleShowdownConfirm(date: Date) {
    const deadline_at = date.toISOString()
    startShowdown.mutate(deadline_at, {
      onSuccess: () => {
        setBox(prev => ({ ...prev, current_round: prev.current_round + 1, deadline_at }))
        setShowdownSheetOpen(false)
      },
    })
  }

  function handleToggleFavorite() {
    setIsFavorite(prev => !prev)
    toggleFavorite.mutate(isFavorite, {
      onError: () => setIsFavorite(prev => !prev),
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
        <button onClick={handleToggleFavorite} className="text-xl shrink-0 active:scale-90 transition-transform">
          {isFavorite ? '★' : '☆'}
        </button>
      </header>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* 상태 + 제목 */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          {status === 'SHOWDOWN' && (
            <span className="inline-block text-xs font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
              결판 중 (라운드 {box.current_round})
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
              <button onClick={handleSaveTitle} disabled={updateTitle.isPending} className="text-sm text-blue-500 font-medium shrink-0">
                저장
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">{box.title}</h2>
              {isOwner && !isDone && (
                <button onClick={() => { setEditingTitle(true); setTitleInput(box.title) }} className="text-xs text-gray-400 shrink-0">
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
              {isOwner && !isDone && (
                <button onClick={() => setDeadlineSheetOpen(true)} className="text-xs text-blue-500">변경</button>
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
            <Link href={`/box/${box.id}/invite`} className="text-xs text-blue-500">+ 친구초대</Link>
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

        <OptionsSection
          boxId={box.id}
          round={box.current_round}
          initialOptions={initialOptions}
          canVote={status === 'OPEN' || status === 'SHOWDOWN'}
        />
      </div>

      {/* 하단 버튼 */}
      <div className="px-5 pb-10 space-y-2">
        {!isDone && (
          <Link href={`/box/${box.id}/option/new`}>
            <button className="w-full border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-medium active:bg-gray-50">
              선택지 추가하기
            </button>
          </Link>
        )}
        {isOwner && !isDone && (
          <button
            onClick={() => setShowdownSheetOpen(true)}
            className="w-full border border-orange-200 text-orange-500 py-3.5 rounded-xl text-sm font-medium active:bg-orange-50"
          >
            끝장전 시작하기
          </button>
        )}
        {isOwner && !isDone && (
          <button
            onClick={() => closeBox.mutate(undefined, {
              onSuccess: () => setBox(prev => ({ ...prev, closed_at: new Date().toISOString() })),
            })}
            disabled={closeBox.isPending}
            className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {closeBox.isPending ? '처리 중...' : '정리 완료하기'}
          </button>
        )}
        {isDone && (
          <div className="text-center py-2 text-sm text-gray-400">
            {status === 'RESOLVED' ? '정리 완료된 상자예요.' : '마감 시간이 지난 상자예요.'}
          </div>
        )}
      </div>

      <DeadlineBottomSheet
        open={deadlineSheetOpen}
        defaultValue={new Date(box.deadline_at)}
        onClose={() => setDeadlineSheetOpen(false)}
        onConfirm={handleDeadlineConfirm}
      />
      <DeadlineBottomSheet
        open={showdownSheetOpen}
        onClose={() => setShowdownSheetOpen(false)}
        onConfirm={handleShowdownConfirm}
      />
    </main>
  )
}
