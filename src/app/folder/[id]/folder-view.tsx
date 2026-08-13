'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useNav } from '@/lib/nav/nav'
import { setPendingBoxFolder } from '@/lib/nav/pending-box-folder'
import { PageHeader } from '@/components/page-header'
import { BoxSummaryCard } from '@/components/box-summary-card'
import { SortableList, SortableItem, lockX } from '@/components/sortable-list'
import { verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Icon } from '@/components/icon'
import { ModeChip } from '@/components/mode-chip'
import { ShareFolderLinkButton } from './share-folder-link-button'
import {
  useRenameFolder,
  useLeaveFolder,
  useReorderFolderBoxes,
  useBoxesNotInFolder,
  useAddBoxesToFolder,
  useSetBoxFolderShared,
  useCoParticipantsForFolder,
  useInviteUsersToFolder,
} from '@/hooks/use-folders'
import { shareInviteLink, hasNativeShare } from '@/lib/share/native-share'
import type { Box } from '@/lib/api/boxes'
import type { BoxCard as BoxCardData } from '@/lib/domain/home'

type CardParticipant = { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }

export interface FolderBoxItem {
  box: Box
  participants: CardParticipant[]
  isNew: boolean
  isFavorite: boolean
  shared: boolean // 이 링크가 공유(서랍 멤버 전원 조회 가능) vs 나만 보기(045)
  addedByMe: boolean // 이 상자를 내가 담았는지(048) — 남이 담은 링크는 공유/나만 토글·빼기·순서 편집 권한이 없다
}

export type FolderMember = { user_id: string; profiles: { id: string; nickname: string; avatar_url: string | null } | null }

interface FolderViewProps {
  folderId: string
  folderName: string
  inviteCode: string
  nickname: string
  currentUserId: string
  members: FolderMember[]
  initialBoxes: FolderBoxItem[]
  /** 상자 탭·홈 서랍 레일과 동일한 카드(BoxSummaryCard)로 그리기 위한 데이터 — items와 동일 순서/집합. */
  cards: BoxCardData[]
}

/** 폴더 멤버 아바타 스택 (공유 폴더 = 누가 들어와 있는지). */
function MemberAvatars({ members, max = 6 }: { members: FolderMember[]; max?: number }) {
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map(m => (
        <div key={m.user_id} className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-paper bg-butter-tint text-[10px] font-bold text-ink">
          {m.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.profiles.avatar_url} alt={m.profiles.nickname} className="h-full w-full object-cover" />
          ) : (
            m.profiles?.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-paper bg-cream text-[10px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

export function FolderView({ folderId, folderName, inviteCode, currentUserId, members, initialBoxes, cards }: FolderViewProps) {
  // box.id로 매칭 — 편집 중 로컬 순서 변경(items)과 서버 cards가 refresh 전까지 순서가 어긋날 수 있어 인덱스 매칭은 위험.
  const cardById = new Map(cards.map(c => [c.id, c]))
  const nav = useNav()
  const [title, setTitle] = useState(folderName)
  const [items, setItems] = useState(initialBoxes)
  const [copied, setCopied] = useState(false)
  // 토스: 담기/무효화 후 쿼리가 새 initialBoxes를 넘기면 목록을 동기화(useState는 최초 1회라 prop만으론 안 바뀜).
  useEffect(() => { setItems(initialBoxes) }, [initialBoxes])
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [alsoLeaveBoxes, setAlsoLeaveBoxes] = useState(false)
  const [nameInput, setNameInput] = useState(folderName)
  const [membersOpen, setMembersOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invitePicked, setInvitePicked] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [confirmShareAdd, setConfirmShareAdd] = useState(false)
  const [shareAddOn, setShareAddOn] = useState(true) // 담기 확인창 스위치(공개/나만) — 기본 공개
  useBodyScrollLock(addOpen || confirmShareAdd || membersOpen || inviteOpen || renaming || confirmLeave)

  const isShared = members.length > 1

  const rename = useRenameFolder()
  const leave = useLeaveFolder()
  const reorder = useReorderFolderBoxes(folderId)
  const addBoxes = useAddBoxesToFolder(folderId)
  const setShared = useSetBoxFolderShared(folderId)

  // 공유 폴더에서 상자별 공유↔나만 토글(045). 낙관적 반영 후 서버 동기화.
  function toggleShared(boxId: string, current: boolean) {
    setItems(prev => prev.map(it => (it.box.id === boxId ? { ...it, shared: !current } : it)))
    setShared.mutate({ boxId, shared: !current }, {
      onError: () => setItems(prev => prev.map(it => (it.box.id === boxId ? { ...it, shared: current } : it))),
    })
  }
  // 시트 열렸을 때만 후보 조회
  const { data: candidates = [], isPending: candLoading } = useBoxesNotInFolder(folderId, addOpen)
  // 초대 시트: '함께했던 사람' 후보(시트 열렸을 때만) + 바로 추가 뮤테이션
  const { data: coParticipants = [], isPending: coLoading } = useCoParticipantsForFolder(folderId, inviteOpen)
  const inviteUsers = useInviteUsersToFolder(folderId)

  function toggleInvitePick(id: string) {
    setInvitePicked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function doInvite() {
    if (invitePicked.size === 0) return
    inviteUsers.mutate(Array.from(invitePicked), {
      onSuccess: () => { setInvitePicked(new Set()); setInviteOpen(false); nav.refresh() },
    })
  }

  function togglePick(id: string) {
    setPicked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function doAdd(shared = true) {
    addBoxes.mutate({ boxIds: Array.from(picked), shared }, {
      onSuccess: () => { setAddOpen(false); setConfirmShareAdd(false); setPicked(new Set()); nav.refresh() },
    })
  }

  // 공유 서랍(2명+)에 기존 상자를 담으면 멤버 전원이 보게 됨 → 유출 방지 확인.
  function confirmAdd() {
    if (picked.size === 0) return
    if (isShared) { setShareAddOn(true); setConfirmShareAdd(true); return }
    doAdd()
  }

  // 토스: 네이티브 공유 시트, 웹: 링크 클립보드 복사(shareInviteLink가 플랫폼 분기).
  async function shareFolder() {
    const result = await shareInviteLink({ path: `/folder-invite/${inviteCode}` })
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }

  // 메인 목록에서 바로 드래그. 드롭 즉시 저장 — 남이 담은(내 소관 아닌) 항목은 순서 저장 대상에서
  // 제외한다(안 그러면 내 이름으로 새로 담아버린다, 048).
  function reorderMain(next: FolderBoxItem[]) {
    setItems(next)
    const mine = next.filter(i => i.addedByMe).map(i => i.box.id)
    if (mine.length > 0) reorder.mutate(mine)
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title={title} />

      {/* 컨텍스트 밴드 — '서랍 안'이라는 정체성(버터틴트). 멤버 영역 탭 → 초대 시트. 공유·이름변경·나가기는 ⋯ 하나로.
          순서 변경은 아래 목록을 바로 드래그(별도 편집 모드 없음). */}
      <div className="mx-5 mb-4 flex items-center justify-between gap-3 rounded-[16px] bg-butter-tint/70 px-4 py-3">
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
                {/* '링크로 초대'는 멤버 영역 탭으로 여는 시트와 중복이라 ⋯ 메뉴에선 제거(멤버 영역 탭으로 접근). */}
                <button
                  onClick={() => { setMenuOpen(false); shareFolder() }}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-ink active:bg-cream"
                >
                  <Icon name="share" size={15} className="text-ink-soft" /> {hasNativeShare() ? '서랍 공유하기' : '공유 링크 복사'}
                </button>
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
      </div>

      <div className="flex-1 space-y-2.5 px-5 pb-32">
        {items.length === 0 ? (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">이 서랍은 비어 있어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">상자 상세의 &lsquo;서랍에 담기&rsquo;에서 이 서랍으로 담아보세요.</p>
          </div>
        ) : (
          <SortableList items={items} getId={i => i.box.id} strategy={verticalListSortingStrategy} modifiers={[lockX]} onReorder={reorderMain}>
            {item => {
            const card = cardById.get(item.box.id)
            if (!card) return null
            // 049: 공유 폴더에서 상자별 공유/나만 토글 — 나 혼자 쓰는 상자에서만. 참여자 2명+인 상자는
            // 이미 여럿이 함께 쓰는 거라 folder-view.ts에서 항상 공유로 강제되므로 토글 자체가 무의미.
            // 라벨이 상태에 따라 '공유'↔'나만'으로 바뀌면 눌렀을 때 뭐가 된 건지 헷갈려서, 라벨은
            // '나만보기'로 고정하고 스위치만 상태를 보여준다(켜짐=나만). absolute로 얹으면 카드마다
            // 다른 내용 높이와 겹쳐서, BoxSummaryCard의 trailing으로 넘겨 카드 안쪽 패딩·플로우를 탄다.
            const showShareToggle = isShared && item.participants.length <= 1 && item.addedByMe
            return (
              <SortableItem key={item.box.id} id={item.box.id}>
                <BoxSummaryCard
                  card={card}
                  currentUserId={currentUserId}
                  isPrivate={showShareToggle && !item.shared}
                  trailing={
                    showShareToggle ? (
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); toggleShared(item.box.id, item.shared) }}
                        disabled={setShared.isPending}
                        aria-pressed={!item.shared}
                        className="flex shrink-0 items-center gap-1.5 text-[10.5px] font-extrabold text-ink-soft"
                      >
                        나만보기
                        <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${!item.shared ? 'bg-ink' : 'bg-[#D9D6C2]'}`}>
                          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-paper shadow-sm transition-all ${!item.shared ? 'left-[14px]' : 'left-0.5'}`} />
                        </span>
                      </button>
                    ) : undefined
                  }
                />
              </SortableItem>
            )
          }}
          </SortableList>
        )}
      </div>

      {/* 하단 CTA — 이 서랍에 바로 담기는 상자를 만든다. 딥페이지라 bottom-0(탭바 없음). */}
      <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
        <button
          onClick={() => { setPicked(new Set()); setAddOpen(true) }}
          className="flex w-full items-center justify-center gap-2 rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
        >
          <Icon name="plus" size={17} strokeWidth={2.4} />
          상자 추가하기
        </button>
      </div>

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
                      <span className="shrink-0"><ModeChip mode={b.mode} /></span>
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

      {/* 공유 서랍 담기 확인 — 멤버 전원이 담긴 상자를 보게 되는 유출 방지 */}
      {confirmShareAdd && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmShareAdd(false)} />
          <div className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="break-keep text-[15px] font-extrabold text-ink">함께 쓰는 서랍이에요</p>
            <p className="mt-1.5 break-keep text-[12.5px] leading-relaxed text-ink-soft">
              &lsquo;{title}&rsquo; 서랍엔 <span className="font-bold text-ink">{members.length}명</span>이 함께 있어요.
            </p>
            <button
              type="button"
              onClick={() => setShareAddOn(v => !v)}
              aria-pressed={shareAddOn}
              className="mt-4 flex w-full items-center justify-between gap-3 rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-left"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-bold text-ink">서랍 사람들에게 공개</span>
                <span className="mt-0.5 block text-[11.5px] text-ink-soft">{shareAddOn ? `멤버 전원이 ${picked.size > 1 ? '상자들을' : '이 상자를'} 봐요` : '나만 볼 수 있어요'}</span>
              </span>
              <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${shareAddOn ? 'bg-ink' : 'bg-[#D9D6C2]'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow-sm transition-all ${shareAddOn ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setConfirmShareAdd(false)}
                className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft active:bg-cream"
              >
                취소
              </button>
              <button
                onClick={() => doAdd(shareAddOn)}
                disabled={addBoxes.isPending}
                className="flex-1 rounded-field bg-ink py-3 text-[13px] font-bold text-cream active:opacity-80 disabled:opacity-50"
              >
                {addBoxes.isPending ? '담는 중…' : '담기'}
              </button>
            </div>
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
            <p className="mb-4 mt-0.5 text-[12px] text-ink-soft">초대하면 이 서랍에 공유된 상자를 볼 수 있어요. 함께 정리하려면 상자에서 &lsquo;함께하기&rsquo;를 눌러야 해요.</p>
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
            <button
              onClick={() => { setMembersOpen(false); setInvitePicked(new Set()); setInviteOpen(true) }}
              className="flex w-full items-center justify-center gap-2 rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
            >
              <Icon name="plus" size={17} strokeWidth={2.4} />
              초대하기
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* 초대 시트 — 함께했던 사람 바로 초대 + 링크로 초대 (상자와 동일 플로우). */}
      {inviteOpen && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => { setInviteOpen(false); setInvitePicked(new Set()) }} />
          <div className="relative mx-auto flex max-h-[80vh] w-full max-w-[430px] flex-col rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <p className="text-[15px] font-extrabold text-ink">서랍에 초대</p>
            <p className="mb-3 mt-0.5 text-[12px] text-ink-soft">초대된 사람은 공유된 상자를 볼 수 있어요. 편집은 상자별로 &lsquo;함께하기&rsquo;를 눌러야 해요.</p>

            {/* 함께했던 사람 (다중 선택 → 바로 서랍 참여) */}
            <div className="min-h-[3rem] flex-1 overflow-y-auto">
              {coLoading ? (
                <p className="py-6 text-center text-[13px] text-ink-faint">불러오는 중…</p>
              ) : coParticipants.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-faint">아직 같이 정한 사람이 없어요. 링크로 초대해요.</p>
              ) : (
                <>
                  <p className="mb-2 text-[12px] font-bold text-ink-faint">함께했던 사람</p>
                  <div className="space-y-1">
                    {coParticipants.map(c => {
                      const on = invitePicked.has(c.id)
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggleInvitePick(c.id)}
                          className={`flex w-full items-center gap-3 rounded-field border px-3 py-2.5 text-left ${
                            on ? 'border-butter-dark bg-butter-tint' : 'border-line bg-paper active:bg-cream'
                          }`}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-paper bg-butter-tint text-[10px] font-bold text-ink">
                            {c.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (c.nickname?.[0] ?? '?')}
                          </div>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{c.nickname}</span>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? 'border-butter-dark bg-butter' : 'border-line bg-paper'}`}>
                            {on && <Icon name="check" size={13} strokeWidth={3.2} className="text-ink" />}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {invitePicked.size > 0 && (
              <button
                onClick={doInvite}
                disabled={inviteUsers.isPending}
                className="mt-3 w-full rounded-field bg-ink py-3.5 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
              >
                {inviteUsers.isPending ? '초대 중…' : `${invitePicked.size}명 초대하기`}
              </button>
            )}

            <div className="mt-2">
              <ShareFolderLinkButton inviteCode={inviteCode} />
            </div>
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
                <span className="break-keep text-[12.5px] leading-relaxed text-ink-soft">
                  담긴 상자 <b className="text-ink">{items.length}개</b>에서도 나가기
                  <br />
                  <span className="text-[11px] text-ink-faint">체크하지 않으면 상자에는 계속 참여해요.</span>
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

      {/* 링크 복사 토스트 (웹) */}
      {copied && createPortal(
        <div className="fixed inset-x-0 bottom-10 z-[70] flex justify-center px-8">
          <span className="rounded-full bg-ink px-4 py-2 text-[12.5px] font-bold text-cream shadow-lg">공유 링크 복사됨!</span>
        </div>,
        document.body,
      )}
    </main>
  )
}
