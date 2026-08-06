'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNav } from '@/lib/nav/nav'
import { setPendingBoxFolder } from '@/lib/nav/pending-box-folder'
import { PageHeader } from '@/components/page-header'
import { BoxCard } from '@/components/box-card'
import { Icon } from '@/components/icon'
import { ShareFolderLinkButton } from './share-folder-link-button'
import {
  useRenameFolder,
  useLeaveFolder,
  useRemoveBoxFromFolder,
  useReorderFolderBoxes,
  useBoxesNotInFolder,
  useAddBoxesToFolder,
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

export function FolderView({ folderId, folderName, inviteCode, members, initialBoxes }: FolderViewProps) {
  const nav = useNav()
  const [title, setTitle] = useState(folderName)
  const [items, setItems] = useState(initialBoxes)
  const [editing, setEditing] = useState(false)
  // 토스: 담기/무효화 후 쿼리가 새 initialBoxes를 넘기면 목록을 동기화(useState는 최초 1회라 prop만으론 안 바뀜).
  // 편집(순서/제외) 중엔 로컬 편집을 덮지 않도록 스킵.
  useEffect(() => { if (!editing) setItems(initialBoxes) }, [initialBoxes, editing])
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [alsoLeaveBoxes, setAlsoLeaveBoxes] = useState(false)
  const [nameInput, setNameInput] = useState(folderName)
  const [membersOpen, setMembersOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())

  const rename = useRenameFolder()
  const leave = useLeaveFolder()
  const removeBox = useRemoveBoxFromFolder()
  const reorder = useReorderFolderBoxes(folderId)
  const addBoxes = useAddBoxesToFolder(folderId)
  // 시트 열렸을 때만 후보 조회
  const { data: candidates = [], isPending: candLoading } = useBoxesNotInFolder(folderId, addOpen)

  function togglePick(id: string) {
    setPicked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function confirmAdd() {
    if (picked.size === 0) return
    addBoxes.mutate(Array.from(picked), {
      onSuccess: () => { setAddOpen(false); setPicked(new Set()); nav.refresh() },
    })
  }

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
      <PageHeader title={title} />

      {/* 컨텍스트 밴드 — '서랍 안'이라는 정체성(버터틴트). 멤버 영역 탭 → 초대 시트. 편집·이름변경·나가기는 ⋯ 하나로. */}
      <div className="mx-5 mb-4 flex items-center justify-between gap-3 rounded-[16px] bg-butter-tint/70 px-4 py-3">
        {editing ? (
          <>
            <p className="text-[12.5px] font-semibold text-ink-soft">순서를 바꾸거나 서랍에서 뺄 수 있어요.</p>
            <button
              onClick={finishEdit}
              className="shrink-0 rounded-full bg-paper px-3.5 py-1.5 text-[12px] font-bold text-ink-soft active:bg-cream"
            >
              완료
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setMembersOpen(true)} className="flex min-w-0 items-center gap-2.5 active:opacity-70">
              <MemberAvatars members={members} />
              <span className="truncate text-[12.5px] font-bold text-ink">
                {isShared ? `${members.length}명이 함께 정리 중` : '나만 보는 서랍'}
              </span>
              <Icon name="chevronRight" size={14} className="shrink-0 text-ink-faint" />
            </button>
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen(v => !v)}
                aria-label="서랍 메뉴"
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft active:bg-paper"
              >
                <Icon name="more" size={18} />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-[14px] border border-line bg-paper py-1 shadow-[0_10px_30px_rgba(42,42,39,0.18)]">
                    <button
                      onClick={() => { setMenuOpen(false); setMembersOpen(true) }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-ink active:bg-cream"
                    >
                      <Icon name="link" size={15} className="text-ink-soft" /> 링크로 초대
                    </button>
                    {items.length > 0 && (
                      <button
                        onClick={() => { setMenuOpen(false); setEditing(true) }}
                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-ink active:bg-cream"
                      >
                        <Icon name="menu" size={15} className="text-ink-soft" /> 상자 순서 편집
                      </button>
                    )}
                    <button
                      onClick={() => { setMenuOpen(false); setNameInput(title); setRenaming(true) }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-ink active:bg-cream"
                    >
                      <Icon name="edit" size={15} className="text-ink-soft" /> 이름 변경
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setAlsoLeaveBoxes(false); setConfirmLeave(true) }}
                      className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-tomato active:bg-tomato-tint"
                    >
                      <Icon name="trash" size={15} /> {isShared ? '서랍 나가기' : '서랍 삭제'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 space-y-2.5 px-5 pb-32">
        {items.length === 0 ? (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">이 서랍은 비어 있어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">상자 상세의 &lsquo;서랍에 담기&rsquo;에서 이 서랍으로 담아보세요.</p>
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
                aria-label="서랍에서 빼기"
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

      {/* 하단 CTA — 이 서랍에 바로 담기는 상자를 만든다. 딥페이지라 bottom-0(탭바 없음). 편집 중엔 숨김. */}
      {!editing && (
        <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
          <button
            onClick={() => { setPicked(new Set()); setAddOpen(true) }}
            className="flex w-full items-center justify-center gap-2 rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
          >
            <Icon name="plus" size={17} strokeWidth={2.4} />
            상자 추가하기
          </button>
        </div>
      )}

      {/* 상자 추가 시트 — 새 상자 만들기 + 기존 상자 담기(다중 선택). */}
      {addOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setAddOpen(false)} />
          <div className="relative mx-auto flex max-h-[80vh] w-full max-w-[430px] flex-col rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <p className="text-[15px] font-extrabold text-ink">상자 추가</p>
            <p className="mb-3 mt-0.5 text-[12px] text-ink-soft">새 상자를 만들거나, 이미 있는 상자를 담아요.</p>

            {/* 새 상자 만들기 */}
            <button
              onClick={() => { setAddOpen(false); setPendingBoxFolder({ id: folderId, name: title }); nav.push('/box/new') }}
              className="mb-3 flex w-full items-center gap-2.5 rounded-field border border-line bg-cream/60 px-4 py-3.5 text-left active:bg-cream"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-cream">
                <Icon name="plus" size={16} strokeWidth={2.4} />
              </span>
              <span className="text-[14px] font-bold text-ink">새 상자 만들기</span>
            </button>

            {/* 기존 상자 담기 */}
            <p className="mb-2 text-[12px] font-bold text-ink-faint">이미 있는 상자</p>
            <div className="mb-4 min-h-[3rem] flex-1 space-y-1.5 overflow-y-auto">
              {candLoading ? (
                <p className="py-6 text-center text-[13px] text-ink-faint">불러오는 중…</p>
              ) : candidates.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-faint">담을 수 있는 상자가 없어요.</p>
              ) : (
                candidates.map(b => {
                  const on = picked.has(b.id)
                  return (
                    <button
                      key={b.id}
                      onClick={() => togglePick(b.id)}
                      className={`flex w-full items-center gap-3 rounded-field border px-4 py-3 text-left ${
                        on ? 'border-butter-dark bg-butter-tint' : 'border-line bg-paper active:bg-cream'
                      }`}
                    >
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] ${
                        on ? 'border-ink bg-ink text-cream' : 'border-line'
                      }`}>
                        {on && <Icon name="check" size={12} strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{b.title}</span>
                      {b.isDone && <span className="shrink-0 rounded-full bg-leaf-tint px-2 py-0.5 text-[10px] font-bold text-[#37714A]">정리됨</span>}
                    </button>
                  )
                })
              )}
            </div>

            <button
              onClick={confirmAdd}
              disabled={picked.size === 0 || addBoxes.isPending}
              className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-40"
            >
              {addBoxes.isPending ? '담는 중…' : picked.size > 0 ? `${picked.size}개 담기` : '상자를 선택하세요'}
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* 멤버 + 초대 시트 — 밴드의 멤버 영역 탭 시. '초대하기 화면'(참여자 목록 + 링크로 초대). */}
      {membersOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setMembersOpen(false)} />
          <div className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <p className="text-[15px] font-extrabold text-ink">
              {isShared ? `함께 정리 중 ${members.length}명` : '아직 나만 있어요'}
            </p>
            <p className="mb-4 mt-0.5 text-[12px] text-ink-soft">링크로 초대하면 이 서랍의 상자를 함께 정리할 수 있어요.</p>
            <div className="mb-4 max-h-[38vh] space-y-2.5 overflow-y-auto">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-butter-tint text-[11px] font-bold text-ink">
                    {m.profiles?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.profiles.avatar_url} alt={m.profiles?.nickname ?? ''} className="h-full w-full object-cover" />
                    ) : (
                      m.profiles?.nickname?.[0] ?? '?'
                    )}
                  </div>
                  <span className="text-sm font-semibold text-ink">{m.profiles?.nickname ?? '알 수 없음'}</span>
                </div>
              ))}
            </div>
            <ShareFolderLinkButton inviteCode={inviteCode} />
          </div>
        </div>,
        document.body,
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
            <p className="text-[15px] font-extrabold text-ink">서랍 이름 변경</p>
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
              {isShared ? '서랍에서 나갈까요?' : '서랍을 삭제할까요?'}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              {isShared
                ? '나만 이 서랍에서 빠지고, 남은 멤버는 그대로 함께 써요.'
                : '서랍만 사라지고 담긴 상자는 그대로 남아요.'}
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
                  이 서랍의 상자 <b className="text-ink">{items.length}개</b>에서도 나가기
                  <br />
                  <span className="text-[11px] text-ink-faint">(다른 서랍에도 든 상자는 유지돼요)</span>
                </span>
              </label>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmLeave(false)} className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft">취소</button>
              <button
                onClick={() => leave.mutate({ folderId, leaveBoxes: alsoLeaveBoxes }, { onSuccess: () => nav.replace('/') })}
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
