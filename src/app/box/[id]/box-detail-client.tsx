'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  useUpdateBoxTitle,
  useUpdateBoxMemo,
  useUpdateBoxDeadline,
  useCloseBox,
  useDeleteBox,
  useReopenBox,
  useStartRematch,
} from '@/hooks/use-boxes'
import { useToggleFavorite } from '@/hooks/use-favorites'
import { useOptions } from '@/hooks/use-options'
import { useBoxVotes } from '@/hooks/use-votes'
import { DeadlineBottomSheet } from '@/components/deadline-bottom-sheet'
import { OptionsSection } from '@/components/options-section'
import { Icon } from '@/components/icon'
import { AppDrawer } from '@/components/app-drawer'
import { PageHeader } from '@/components/page-header'
import { getBoxStatus, isDoneStatus, BOX_STATUS_LABEL, type BoxStatus } from '@/lib/domain/box-status'
import { getVoteResult } from '@/lib/domain/winner'
import { parseBlocks, linkBlocksOf } from '@/lib/domain/option-content'
import { formatKoreanDate, formatDeadline, defaultDeadline } from '@/lib/utils'
import type { BoxWithParticipants } from '@/lib/api/boxes'
import type { Option } from '@/lib/api/options'

interface BoxDetailClientProps {
  box: BoxWithParticipants
  isOwner: boolean
  currentUserId: string
  initialOptions: Option[]
  initialIsFavorite: boolean
}

const STATUS_BADGE_CLASS: Record<BoxStatus, string> = {
  RESOLVED: 'bg-leaf-tint text-[#37714A]',
  EXPIRED: 'bg-[#EDEBDD] text-ink-soft',
  SHOWDOWN: 'bg-tangerine text-[#FFF7EC]',
  OPEN: 'border border-[#D9D6C2] bg-paper text-ink-soft',
}

type SheetPurpose = 'deadline' | 'rematch' | 'reopen'

export function BoxDetailClient({ box: initialBox, isOwner, currentUserId, initialOptions, initialIsFavorite }: BoxDetailClientProps) {
  const [box, setBox] = useState(initialBox)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(box.title)
  const [editingMemo, setEditingMemo] = useState(false)
  const [memoInput, setMemoInput] = useState(box.memo ?? '')
  const [sheetPurpose, setSheetPurpose] = useState<SheetPurpose | null>(null)
  const [confirmDeleteBox, setConfirmDeleteBox] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)

  const updateTitle = useUpdateBoxTitle(box.id)
  const updateMemo = useUpdateBoxMemo(box.id)
  const updateDeadline = useUpdateBoxDeadline(box.id)
  const closeBox = useCloseBox(box.id)
  const deleteBox = useDeleteBox()
  const reopenBox = useReopenBox(box.id)
  const startRematch = useStartRematch(box.id)
  const toggleFavorite = useToggleFavorite(box.id)

  const { data: options = initialOptions } = useOptions(box.id)
  const { data: votes = {} } = useBoxVotes(box.id, box.current_round)
  const hasLinks = options.some(o => linkBlocksOf(parseBlocks(o.content)).length > 0)
  const myNickname = box.box_participants.find(p => p.user_id === currentUserId)?.profiles?.nickname ?? ''

  const status = getBoxStatus(box)
  const isDone = isDoneStatus(status)
  const isSolo = box.box_participants.length === 1

  const voteResult = getVoteResult(
    options.map(o => {
      const c = votes[o.id] ?? { like: 0, dislike: 0, myVote: null }
      return { name: o.name, like: c.like }
    })
  )

  // 마감이 이미 지난 상자를 다시 열려면 새 마감이 필요하다 (reopen_box RPC 규칙)
  const reopenNeedsDeadline = !!box.deadline_at && new Date(box.deadline_at) <= new Date()

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

  function handleSaveMemo() {
    const next = memoInput.trim() || null
    if (next === (box.memo ?? null)) {
      setEditingMemo(false)
      return
    }
    updateMemo.mutate(next, {
      onSuccess: () => {
        setBox(prev => ({ ...prev, memo: next }))
        setEditingMemo(false)
      },
    })
  }

  function handleSheetConfirm(date: Date) {
    const deadline_at = date.toISOString()
    if (sheetPurpose === 'deadline') {
      updateDeadline.mutate(deadline_at, {
        onSuccess: () => {
          setBox(prev => ({ ...prev, deadline_at }))
          setSheetPurpose(null)
        },
      })
    } else if (sheetPurpose === 'rematch') {
      startRematch.mutate(deadline_at, {
        onSuccess: () => {
          setBox(prev => ({
            ...prev,
            current_round: prev.current_round + 1,
            deadline_at,
            closed_at: null,
          }))
          setSheetPurpose(null)
        },
      })
    } else if (sheetPurpose === 'reopen') {
      reopenBox.mutate(deadline_at, {
        onSuccess: () => {
          setBox(prev => ({ ...prev, closed_at: null, deadline_at }))
          setSheetPurpose(null)
        },
      })
    }
  }

  function handleReopen() {
    if (reopenNeedsDeadline) {
      setSheetPurpose('reopen')
      return
    }
    reopenBox.mutate(null, {
      onSuccess: () => {
        setBox(prev => ({ ...prev, closed_at: null }))
        setConfirmReopen(false)
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
    <main className="flex min-h-dvh flex-col">
      <PageHeader
        fallbackHref={isDone ? '/done' : '/messy'}
        right={
          <div className="flex items-center gap-0.5">
            {hasLinks && (
              <Link
                href={`/box/${box.id}/links`}
                aria-label="링크 모아보기"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink active:bg-butter-tint"
              >
                <Icon name="link" size={20} />
              </Link>
            )}
            <button
              onClick={handleToggleFavorite}
              aria-label="즐겨찾기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
            >
              <Icon
                name="star"
                size={22}
                strokeWidth={1.6}
                className={isFavorite ? undefined : 'text-ink-faint'}
                style={isFavorite ? { fill: 'var(--color-butter)', stroke: 'var(--color-butter-dark)' } : undefined}
              />
            </button>
            <AppDrawer nickname={myNickname} />
          </div>
        }
      />

      {/* 상자 삭제 확인 */}
      {confirmDeleteBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmDeleteBox(false)} />
          <div className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="text-[15px] font-extrabold text-ink">상자를 삭제할까요?</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">선택지·투표·댓글이 모두 사라져요. 되돌릴 수 없어요.</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDeleteBox(false)}
                className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={() => deleteBox.mutate(box.id)}
                disabled={deleteBox.isPending}
                className="flex-1 rounded-field bg-tomato py-3 text-[13px] font-bold text-white disabled:opacity-50"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 px-5 pb-5 pt-1">
        {/* 히어로: 상태 · 질문 · 메모 · 메타 · 참여 */}
        <div className="space-y-3">
          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[status]}`}>
            {status === 'SHOWDOWN' ? `🔥 결판 중 · ${box.current_round}라운드` : BOX_STATUS_LABEL[status]}
          </span>

          {editingTitle ? (
            <div className="flex items-end gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                maxLength={50}
                autoFocus
                className="flex-1 border-b-[1.5px] border-butter-dark bg-transparent pb-1 text-[22px] font-extrabold leading-tight text-ink focus:outline-none"
              />
              <button
                onClick={handleSaveTitle}
                disabled={updateTitle.isPending}
                className="shrink-0 pb-1 text-sm font-bold text-ink"
              >
                저장
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2">
              <h1 className="min-w-0 text-[22px] font-extrabold leading-tight tracking-tight text-ink">{box.title}</h1>
              {isOwner && !isDone && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-ink-faint active:text-ink"
                  >
                    <Icon name="edit" size={13} />
                    편집
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-[14px] border border-line bg-paper py-1 shadow-[0_8px_24px_rgba(42,42,39,0.16)]">
                        <button
                          onClick={() => { setMenuOpen(false); setEditingTitle(true); setTitleInput(box.title) }}
                          className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                        >
                          제목 수정
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setEditingMemo(true); setMemoInput(box.memo ?? '') }}
                          className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                        >
                          {box.memo ? '메모 수정' : '메모 추가'}
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setConfirmDeleteBox(true) }}
                          className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-tomato active:bg-tomato-tint"
                        >
                          상자 삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {editingMemo ? (
            <div className="space-y-1.5">
              <textarea
                value={memoInput}
                onChange={e => setMemoInput(e.target.value)}
                rows={2}
                maxLength={500}
                autoFocus
                placeholder="메모를 입력하세요 (예: 예산, 조건)"
                className="w-full resize-none rounded-[14px] border-[1.5px] border-butter-dark bg-paper px-3 py-2.5 text-[12.5px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingMemo(false)} className="text-[12px] font-bold text-ink-soft">
                  취소
                </button>
                <button onClick={handleSaveMemo} disabled={updateMemo.isPending} className="text-[12px] font-bold text-ink disabled:opacity-50">
                  저장
                </button>
              </div>
            </div>
          ) : box.memo ? (
            <p className="rounded-[14px] border border-dashed border-[#D9D6C2] bg-paper px-3 py-2.5 text-[12.5px] text-ink-soft">
              ✏️ {box.memo}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            {isOwner && !isDone ? (
              <button
                onClick={() => setSheetPurpose('deadline')}
                className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft active:bg-cream"
              >
                <Icon name="calendar" size={14} />
                {box.deadline_at ? formatDeadline(box.deadline_at) : '마감 없음 · 정하기'}
              </button>
            ) : (
              <span className="flex items-center gap-1.5 text-[12px] text-ink-faint">
                <Icon name="calendar" size={14} />
                마감 {formatDeadline(box.deadline_at)}
              </span>
            )}
            <span className="text-[11px] text-ink-faint">생성 {formatKoreanDate(box.created_at)}</span>
          </div>

          {/* 참여 (가벼운 스트립) */}
          <div className="flex items-center justify-between gap-2 rounded-[14px] bg-cream/70 px-3.5 py-2.5">
            {isSolo ? (
              <p className="min-w-0 text-[12px] leading-relaxed text-ink-soft">
                <span className="font-bold text-ink">혼자 정리 중</span>이에요.<br />
                함께 정하고 싶으면 친구를 초대해보세요.
              </p>
            ) : (
              <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="text-[12px] font-bold text-ink">친구 {box.box_participants.length}명</span>
                {box.box_participants.map(p => (
                  <div key={p.user_id} className="flex items-center gap-1.5">
                    <div className="h-6 w-6 overflow-hidden rounded-full border border-paper bg-butter-tint">
                      {p.profiles?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.profiles.avatar_url} alt={p.profiles.nickname} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-ink">
                          {p.profiles?.nickname?.[0] ?? '?'}
                        </div>
                      )}
                    </div>
                    <span className="text-[11.5px] font-semibold text-ink">{p.profiles?.nickname}</span>
                  </div>
                ))}
              </div>
            )}
            <Link
              href={`/box/${box.id}/invite`}
              className="shrink-0 rounded-full border-[1.5px] border-dashed border-[#C9C7B6] bg-paper px-2.5 py-1 text-[11.5px] font-bold text-ink-soft active:bg-cream"
            >
              + 초대
            </Link>
          </div>
        </div>

        {/* 결정 결과 (정리된 상자) */}
        {isDone && (
          <div className="space-y-3 rounded-card border border-[#ECEADC] bg-paper p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex rotate-[-7deg] items-center justify-center rounded-[46%_54%_50%_50%/58%_46%_54%_42%] border-[2.5px] border-tangerine px-3 py-1.5 text-xs font-extrabold tracking-wide text-tangerine">
                {status === 'RESOLVED' ? '정리완료!' : '시간만료'}
              </span>
              <div className="min-w-0 flex-1">
                {voteResult.winner ? (
                  <p className="text-[15px] font-extrabold text-ink">
                    <span className="[box-shadow:inset_0_-8px_0_#FFD84A]">{voteResult.winner}</span>
                    (으)로 결정!
                  </p>
                ) : voteResult.coLeaders.length >= 2 ? (
                  <p className="text-[13.5px] font-bold text-ink">
                    공동 1등 — {voteResult.coLeaders.join(', ')}
                  </p>
                ) : (
                  <p className="text-[13px] text-ink-soft">투표 없이 마무리됐어요</p>
                )}
              </div>
            </div>

            {/* 동점 재투표 제안 (spec 6장) */}
            {status === 'EXPIRED' && voteResult.coLeaders.length >= 2 && (
              <div className="rounded-field bg-butter-tint px-4 py-3.5">
                <p className="text-[13px] font-extrabold text-ink">공동 1등이 나왔어요!</p>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {isOwner ? '1등끼리 결승전으로 정해볼까요?' : '방장이 결승전을 시작할 수 있어요'}
                </p>
                {isOwner && (
                  <button
                    onClick={() => setSheetPurpose('rematch')}
                    disabled={startRematch.isPending}
                    className="mt-2.5 w-full rounded-field bg-butter py-3 text-[13px] font-extrabold text-ink shadow-[0_1.5px_0_#E3B93A] active:opacity-80 disabled:opacity-50"
                  >
                    🔥 결승전 시작하기
                  </button>
                )}
              </div>
            )}

            {/* 다시 정리하기 */}
            {isOwner && (
              confirmReopen ? (
                <div className="space-y-2">
                  <p className="text-center text-[12.5px] text-ink-soft">
                    상자를 다시 열까요?{reopenNeedsDeadline && ' 새 마감 기한을 정해야 해요.'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmReopen(false)}
                      className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleReopen}
                      disabled={reopenBox.isPending}
                      className="flex-1 rounded-field border-[1.5px] border-ink py-3 text-[13px] font-bold text-ink disabled:opacity-50"
                    >
                      다시 열기
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReopen(true)}
                  className="w-full rounded-field border-[1.5px] border-ink bg-paper py-3 text-[13px] font-bold text-ink active:bg-cream"
                >
                  다시 정리하기
                </button>
              )
            )}
          </div>
        )}

        <OptionsSection
          boxId={box.id}
          round={box.current_round}
          initialOptions={initialOptions}
          canVote={status === 'OPEN' || status === 'SHOWDOWN'}
        />

        {!isDone && (
          <Link href={`/box/${box.id}/option/new`} className="block">
            <div className="flex items-center justify-center gap-1.5 rounded-[18px] border border-dashed border-[#D9D6C2] bg-paper/50 py-4 text-[13px] font-bold text-ink-soft active:bg-cream">
              <Icon name="plus" size={16} />
              선택지 추가하기
            </div>
          </Link>
        )}
      </div>

      {/* 하단: 결정 (방장) */}
      {isOwner && !isDone && (
        <div className="px-5 pb-10">
          <button
            onClick={() => closeBox.mutate(undefined, {
              onSuccess: () => setBox(prev => ({ ...prev, closed_at: new Date().toISOString() })),
            })}
            disabled={closeBox.isPending}
            className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
          >
            {closeBox.isPending ? '결정하는 중...' : '이대로 결정하기'}
          </button>
        </div>
      )}

      <DeadlineBottomSheet
        open={sheetPurpose !== null}
        defaultValue={box.deadline_at ? new Date(box.deadline_at) : defaultDeadline()}
        onClose={() => setSheetPurpose(null)}
        onConfirm={handleSheetConfirm}
      />
    </main>
  )
}
