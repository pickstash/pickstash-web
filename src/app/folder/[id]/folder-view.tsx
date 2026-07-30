'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { AppDrawer } from '@/components/app-drawer'
import { BoxCard } from '@/components/box-card'
import { Icon } from '@/components/icon'
import { ShareFolderLinkButton } from './share-folder-link-button'
import {
  useRenameFolder,
  useLeaveFolder,
  useRemoveBoxFromFolder,
  useReorderFolderBoxes,
} from '@/hooks/use-folders'
import type { Box } from '@/lib/api/boxes'

type CardParticipant = { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }

export interface FolderBoxItem {
  box: Box
  participants: CardParticipant[]
  isNew: boolean
  isFavorite: boolean
}

export type FolderMember = { user_id: string; profiles: { id: string; nickname: string; avatar_url: string | null } | null }

interface FolderViewProps {
  folderId: string
  folderName: string
  inviteCode: string
  nickname: string
  members: FolderMember[]
  initialBoxes: FolderBoxItem[]
}

/** 폴더 멤버 아바타 스택 (공유 폴더 = 누가 들어와 있는지). */
function MemberAvatars({ members, max = 6 }: { members: FolderMember[]; max?: number }) {
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map(m => (
        <div key={m.user_id} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-cream bg-butter-tint text-[10px] font-bold text-ink">
          {m.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.profiles.avatar_url} alt={m.profiles.nickname} className="h-full w-full object-cover" />
          ) : (
            m.profiles?.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-cream bg-cream text-[10px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

export function FolderView({ folderId, folderName, inviteCode, nickname, members, initialBoxes }: FolderViewProps) {
  const router = useRouter()
  const [title, setTitle] = useState(folderName)
  const [items, setItems] = useState(initialBoxes)
  const [editing, setEditing] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [alsoLeaveBoxes, setAlsoLeaveBoxes] = useState(false)
  const [nameInput, setNameInput] = useState(folderName)

  const rename = useRenameFolder()
  const leave = useLeaveFolder()
  const removeBox = useRemoveBoxFromFolder()
  const reorder = useReorderFolderBoxes(folderId)

  const isShared = members.length > 1

  function move(index: number, dir: -1 | 1) {
    setItems(prev => {
      const next = [...prev]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function exclude(boxId: string) {
    setItems(prev => prev.filter(i => i.box.id !== boxId))
    removeBox.mutate({ boxId, folderId })
  }

  function finishEdit() {
    if (items.length > 0) reorder.mutate(items.map(i => i.box.id))
    setEditing(false)
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader
        title={title}
        right={
          <div className="flex items-center gap-0.5">
            {items.length > 0 && (
              <button
                onClick={editing ? finishEdit : () => setEditing(true)}
                className="flex h-9 items-center gap-1 rounded-full px-2 text-[12.5px] font-semibold text-ink-faint active:text-ink"
              >
                {editing ? (
                  '완료'
                ) : (
                  <>
                    <Icon name="edit" size={14} />
                    편집
                  </>
                )}
              </button>
            )}
            <AppDrawer nickname={nickname} />
          </div>
        }
      />

      <div className="flex items-start justify-between gap-3 px-5 pb-3">
        <p className="text-[13px] leading-relaxed text-ink-soft">
          {editing ? '순서를 바꾸거나 폴더에서 뺄 수 있어요.' : `${title} 폴더에 모아둔 상자예요.`}
        </p>
        {!editing && <ShareFolderLinkButton inviteCode={inviteCode} />}
      </div>

      {/* 공유 폴더 멤버(참여자) */}
      {!editing && (
        <div className="flex items-center gap-2 px-5 pb-4">
          <MemberAvatars members={members} />
          <span className="text-[12px] font-semibold text-ink-soft">
            {isShared ? `${members.length}명이 함께 정리 중` : '나만 보는 폴더'}
          </span>
        </div>
      )}

      <div className={`flex-1 space-y-2.5 px-5 ${editing ? 'pb-28' : 'pb-10'}`}>
        {items.length === 0 ? (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">이 폴더는 비어 있어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">상자 상세의 &lsquo;폴더 지정&rsquo;에서 이 폴더로 담아보세요.</p>
          </div>
        ) : editing ? (
          items.map((item, i) => (
            <div
              key={item.box.id}
              className="flex items-center gap-2 rounded-card border border-[#ECEADC] bg-paper px-3 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-ink">{item.box.title}</span>
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="위로"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft disabled:opacity-30 active:bg-cream"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label="아래로"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft disabled:opacity-30 active:bg-cream"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              <button
                onClick={() => exclude(item.box.id)}
                aria-label="폴더에서 빼기"
                className="flex h-8 w-8 items-center justify-center rounded-full text-tomato active:bg-tomato-tint"
              >
                <Icon name="close" size={17} strokeWidth={2.4} />
              </button>
            </div>
          ))
        ) : (
          items.map(item => (
            <BoxCard
              key={item.box.id}
              box={item.box}
              participants={item.participants}
              isNew={item.isNew}
              isFavorite={item.isFavorite}
            />
          ))
        )}
      </div>

      {/* 편집 중 하단 고정: 이름 변경 · 나가기/삭제 */}
      {editing && (
        <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 gap-2.5 bg-cream px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
          <button
            onClick={() => { setNameInput(title); setRenaming(true) }}
            className="rounded-field border border-line bg-paper py-3.5 text-[13px] font-bold text-ink-soft active:bg-cream"
          >
            이름 변경
          </button>
          <button
            onClick={() => { setAlsoLeaveBoxes(false); setConfirmLeave(true) }}
            className="rounded-field border border-tomato/40 bg-tomato-tint py-3.5 text-[13px] font-bold text-tomato active:opacity-80"
          >
            {isShared ? '폴더 나가기' : '폴더 삭제'}
          </button>
        </div>
      )}

      {/* 이름 변경 모달 (공유 — 멤버 전원 반영) */}
      {renaming && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setRenaming(false)} />
          <form
            onSubmit={e => {
              e.preventDefault()
              const n = nameInput.trim()
              if (!n || rename.isPending) return
              rename.mutate({ id: folderId, name: n }, { onSuccess: () => { setTitle(n); setRenaming(false) } })
            }}
            className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]"
          >
            <p className="text-[15px] font-extrabold text-ink">폴더 이름 변경</p>
            {isShared && <p className="mt-1 text-[12px] text-ink-soft">함께 쓰는 멤버 전원에게 반영돼요.</p>}
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              maxLength={20}
              className="mt-3 w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-butter-dark focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setRenaming(false)} className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft">취소</button>
              <button type="submit" disabled={!nameInput.trim() || rename.isPending} className="flex-1 rounded-field bg-ink py-3 text-[13px] font-bold text-cream disabled:opacity-50">저장</button>
            </div>
          </form>
        </div>,
        document.body,
      )}

      {/* 나가기(공유) / 삭제(혼자) 확인 — "상자에서도 나가기" 옵션 */}
      {confirmLeave && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmLeave(false)} />
          <div className="relative w-full max-w-[320px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="text-[15px] font-extrabold text-ink">
              {isShared ? '폴더에서 나갈까요?' : '폴더를 삭제할까요?'}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              {isShared
                ? '나만 이 폴더에서 빠지고, 남은 멤버는 그대로 함께 써요.'
                : '폴더만 사라지고 담긴 상자는 그대로 남아요.'}
            </p>
            {items.length > 0 && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-field bg-cream px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={alsoLeaveBoxes}
                  onChange={e => setAlsoLeaveBoxes(e.target.checked)}
                  className="mt-0.5 h-[17px] w-[17px] rounded accent-ink"
                />
                <span className="text-[12.5px] leading-relaxed text-ink-soft">
                  이 폴더의 상자 <b className="text-ink">{items.length}개</b>에서도 나가기
                  <br />
                  <span className="text-[11px] text-ink-faint">(다른 폴더에도 든 상자는 유지돼요)</span>
                </span>
              </label>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmLeave(false)} className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft">취소</button>
              <button
                onClick={() => leave.mutate({ folderId, leaveBoxes: alsoLeaveBoxes }, { onSuccess: () => router.replace('/') })}
                disabled={leave.isPending}
                className="flex-1 rounded-field bg-tomato py-3 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {isShared ? '나가기' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </main>
  )
}
