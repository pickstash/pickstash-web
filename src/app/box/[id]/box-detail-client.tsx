'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNav, AppLink } from '@/lib/nav/nav'
import {
  useUpdateBoxTitle,
  useUpdateBoxMemo,
  useUpdateBoxDeadline,
  useUpdateBoxDecisionMode,
  useDecideBox,
  useLeaveBox,
  useReopenBox,
} from '@/hooks/use-boxes'
import { useToggleFavorite } from '@/hooks/use-favorites'
import { useFolders, useMyBoxFolders, useSetBoxFolders, useCreateFolder } from '@/hooks/use-folders'
import { useOptions } from '@/hooks/use-options'
import { useBoxVotes } from '@/hooks/use-votes'
import { useCoParticipants, useInviteUsersToBox } from '@/hooks/use-invites'
import { DeadlineBottomSheet } from '@/components/deadline-bottom-sheet'
import { OptionsSection } from '@/components/options-section'
import { Icon } from '@/components/icon'
import { AppDrawer } from '@/components/app-drawer'
import { PageHeader } from '@/components/page-header'
import { shareInviteLink } from '@/lib/share/native-share'
import { getBoxStatus, isDoneStatus, BOX_STATUS_LABEL, type BoxStatus } from '@/lib/domain/box-status'
import { parseBlocks, linkBlocksOf } from '@/lib/domain/option-content'
import { formatDeadlineCompact, defaultDeadline } from '@/lib/utils'
import type { BoxWithParticipants, BoxParticipant, DecisionMode } from '@/lib/api/boxes'
import type { Option } from '@/lib/api/options'

interface BoxDetailClientProps {
  box: BoxWithParticipants
  currentUserId: string
  initialOptions: Option[]
  initialIsFavorite: boolean
}

const STATUS_BADGE_CLASS: Record<BoxStatus, string> = {
  RESOLVED: 'bg-leaf-tint text-[#37714A]',
  OPEN: 'border border-[#D9D6C2] bg-paper text-ink-soft',
}

const DECISION_MODES: { value: DecisionMode; label: string; sub: string }[] = [
  { value: 'manual', label: '직접 정하기', sub: '원할 때 직접 골라 정해요' },
  { value: 'auto_deadline', label: '마감 투표', sub: '마감 때 좋아요 최다가 자동으로' },
]

/** 겹쳐진 참여자 아바타 스택 (트리플 스타일). trailing으로 스택 끝에 초대 버튼 등을 겹쳐 넣는다. */
function ParticipantAvatars({ participants, max = 5, trailing }: { participants: BoxParticipant[]; max?: number; trailing?: ReactNode }) {
  const shown = participants.slice(0, max)
  const extra = participants.length - shown.length
  return (
    <div className="flex -space-x-2">
      {shown.map(p => (
        <div key={p.user_id} className="h-7 w-7 overflow-hidden rounded-full border border-paper bg-butter-tint">
          {p.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profiles.avatar_url} alt={p.profiles.nickname} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-ink">
              {p.profiles?.nickname?.[0] ?? '?'}
            </div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-paper bg-cream text-[10px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
      {trailing}
    </div>
  )
}

/** 색연필로 슥슥 그린 듯한 손그림 동그라미 스탬프 (정리완료!) */
function PencilCircle({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex -rotate-3 items-center justify-center px-4 py-1.5">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 120 48"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M62 6C34 4 12 11 8 22C5 33 30 43 60 43C90 43 116 34 112 21C109 10 84 4 52 8"
          stroke="var(--color-tangerine)"
          strokeWidth="2.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M56 10C36 10 17 15 14 22C12 30 33 39 59 39C85 39 108 32 107 23"
          stroke="var(--color-tangerine)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative text-[12.5px] font-extrabold tracking-wide text-tangerine">{children}</span>
    </span>
  )
}

export function BoxDetailClient({ box: initialBox, currentUserId, initialOptions, initialIsFavorite }: BoxDetailClientProps) {
  const nav = useNav()
  const [box, setBox] = useState(initialBox)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState(box.title)
  const [editingMemo, setEditingMemo] = useState(false)
  const [memoInput, setMemoInput] = useState(box.memo ?? '')
  const [deadlineSheet, setDeadlineSheet] = useState(false)
  const [modeModal, setModeModal] = useState(false)
  const [selectedMode, setSelectedMode] = useState<DecisionMode>('manual')
  const [switchingToAuto, setSwitchingToAuto] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [confirmReopen, setConfirmReopen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [folderModal, setFolderModal] = useState(false)
  const [folderNameInput, setFolderNameInput] = useState('')
  const [confirmShareFolder, setConfirmShareFolder] = useState<{ id: string; name: string; count: number } | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invitePicked, setInvitePicked] = useState<Set<string>>(new Set())
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [deciding, setDeciding] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // 이 상자를 여는 순간 서버(page.tsx)의 auto_decide_box가 "방금" 자동 마감했다면,
  // 홈·목록(서버 컴포넌트)의 Router Cache가 stale하게 남는다(마감 상자가 계속 최상단에 뜸).
  // 최초 1회 router.refresh()로 캐시를 비워 뒤로가기/재방문 때 정상 반영되게 한다.
  const refreshedForAutoClose = useRef(false)
  useEffect(() => {
    if (refreshedForAutoClose.current) return
    const closedAt = initialBox.closed_at ? new Date(initialBox.closed_at).getTime() : 0
    const justAutoClosed =
      initialBox.decision_mode === 'auto_deadline' && closedAt > 0 && Date.now() - closedAt < 60_000
    if (justAutoClosed) {
      refreshedForAutoClose.current = true
      nav.refresh()
    }
    // 마운트 시점의 initialBox 상태로 1회만 판단(refresh는 클라이언트 상태를 보존해 재실행/루프 없음).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateTitle = useUpdateBoxTitle(box.id)
  const updateMemo = useUpdateBoxMemo(box.id)
  const updateDeadline = useUpdateBoxDeadline(box.id)
  const updateDecisionMode = useUpdateBoxDecisionMode(box.id)
  const decideBox = useDecideBox(box.id)
  const leaveBox = useLeaveBox()
  const reopenBox = useReopenBox(box.id)
  const toggleFavorite = useToggleFavorite(box.id)
  const { data: folders = [] } = useFolders()
  const { data: myFolderIds = [] } = useMyBoxFolders(box.id)
  const setFolders = useSetBoxFolders(box.id)
  const createFolder = useCreateFolder()
  // 부분 초대(그때그때) — 초대 시트 열렸을 때만 '함께했던 사람' 후보 조회.
  const { data: coParticipants = [], isPending: coLoading } = useCoParticipants(box.id, inviteOpen)
  const inviteUsers = useInviteUsersToBox(box.id)

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

  const { data: options = initialOptions } = useOptions(box.id)
  const { data: votes = {} } = useBoxVotes(box.id, box.current_round)
  const hasLinks = options.some(o => linkBlocksOf(parseBlocks(o.content)).length > 0)
  const myNickname = box.box_participants.find(p => p.user_id === currentUserId)?.profiles?.nickname ?? ''

  const status = getBoxStatus(box)
  const isDone = isDoneStatus(status)
  const isSolo = box.box_participants.length === 1
  const isAuto = box.decision_mode === 'auto_deadline'
  const showLikes = !isSolo                          // 혼자 상자는 좋아요 미표시

  // 폴더 지정/해제 (018: 다중 선택 토글, 모달 유지). 무효화로 체크 갱신.
  function applyFolder(folderId: string) {
    const set = new Set(myFolderIds)
    if (set.has(folderId)) set.delete(folderId)
    else set.add(folderId)
    setFolders.mutate(Array.from(set))
  }

  // 공유 서랍(2명+)에 '새로 담기'면 유출 방지 확인창을 먼저 띄운다. 빼기·개인 서랍은 즉시.
  function toggleFolder(folderId: string) {
    const adding = !myFolderIds.includes(folderId)
    const f = folders.find(x => x.id === folderId)
    if (adding && f && f.member_count > 1) {
      setConfirmShareFolder({ id: folderId, name: f.name, count: f.member_count })
      return
    }
    applyFolder(folderId)
  }

  const decidedOptions = options.filter(o => o.decided_at)
  const likeOf = (id: string) => votes[id]?.like ?? 0
  const maxLikes = options.reduce((m, o) => Math.max(m, likeOf(o.id)), 0)
  const leaderIds = maxLikes > 0 ? options.filter(o => likeOf(o.id) === maxLikes).map(o => o.id) : []
  const leaderNames = options.filter(o => leaderIds.includes(o.id)).map(o => o.name)

  const inviteButton = (
    <div className="flex h-7 items-center gap-0.5 rounded-full border-2 border-cream bg-butter pl-1.5 pr-2.5 text-[12px] font-extrabold text-ink shadow-[0_1px_0_#E3B93A]">
      <Icon name="plus" size={13} strokeWidth={2.4} />
      초대
    </div>
  )

  // 마감 칩은 '마감 투표' 상자에서만 (직접 정하기 상자는 마감 없음). 참여자 누구나 수정.
  const deadlineNode = !isAuto ? null : !isDone ? (
    <button
      onClick={() => setDeadlineSheet(true)}
      className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft active:bg-cream"
    >
      <Icon name="calendar" size={14} />
      {box.deadline_at ? `마감 ${formatDeadlineCompact(box.deadline_at)}` : '마감일 정하기'}
    </button>
  ) : (
    <span className="flex items-center gap-1.5 rounded-full border border-line bg-cream px-3 py-1.5 text-[12px] font-bold text-ink-faint">
      <Icon name="calendar" size={14} />
      {box.deadline_at ? `마감 ${formatDeadlineCompact(box.deadline_at)}` : '마감 없음'}
    </span>
  )

  // 초대 링크(/invite/<code>) 공유 — 웹: 클립보드 복사, 토스: intoss:// 네이티브 공유 시트.
  // (뷰어+참여가 한 링크. 마감 상자는 초대 개념이 없어 비활성.)
  async function copyInvite() {
    const result = await shareInviteLink({ path: `/invite/${box.invite_code}` })
    if (result === 'copied') {
      setInviteCopied(true)
      setTimeout(() => setInviteCopied(false), 1800)
    }
  }

  function inviteEntry(children: ReactNode, label: string) {
    // 토스: 웹 전용 카카오 페이지로 이동하는 대신, 참여자 목록 + 초대 링크 시트를 연다.
    if (nav.platform === 'toss') {
      return (
        <button onClick={() => setMembersOpen(true)} aria-label={label} className="inline-flex rounded-full active:opacity-70">
          {children}
        </button>
      )
    }
    return (
      <AppLink href={`/box/${box.id}/invite`} aria-label={label} className="inline-flex rounded-full active:opacity-70">
        {children}
      </AppLink>
    )
  }

  // 혼자 상자: 아바타 숨기고 초대 버튼만 (마감된 혼자 상자는 아무것도 안 보임)
  const participantsNode = isSolo
    ? (isDone ? null : inviteEntry(inviteButton, '친구 초대'))
    : inviteEntry(
        <ParticipantAvatars participants={box.box_participants} trailing={isDone ? undefined : inviteButton} />,
        isDone ? '함께한 사람 보기' : '친구 초대',
      )

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

  // 마감일 확정 — 마감 투표로 전환 중이면 결정 방식까지 변경, 아니면 마감일만 수정
  function handleDeadlineConfirm(date: Date) {
    const deadline_at = date.toISOString()
    if (switchingToAuto) {
      updateDecisionMode.mutate({ mode: 'auto_deadline', deadline_at }, {
        onSuccess: () => {
          setBox(prev => ({ ...prev, decision_mode: 'auto_deadline', deadline_at }))
          setSwitchingToAuto(false)
          setDeadlineSheet(false)
        },
      })
    } else {
      updateDeadline.mutate(deadline_at, {
        onSuccess: () => {
          setBox(prev => ({ ...prev, deadline_at }))
          setDeadlineSheet(false)
        },
      })
    }
  }

  // 결정 방식 모달 열기: 현재(또는 지정) 방식을 선택 상태로 세팅해 연다
  function openModeModal(initial: DecisionMode) {
    setSelectedMode(initial)
    setModeModal(true)
  }

  // 결정 방식 변경 (참여자 누구나): 직접 정하기는 즉시, 마감 투표는 마감일 시트를 거쳐 적용
  function chooseMode(mode: DecisionMode) {
    if (mode === box.decision_mode) { setModeModal(false); return }
    if (mode === 'manual') {
      updateDecisionMode.mutate({ mode: 'manual', deadline_at: null }, {
        onSuccess: () => {
          setBox(prev => ({ ...prev, decision_mode: 'manual', deadline_at: null }))
          setModeModal(false)
        },
      })
    } else {
      setModeModal(false)
      setSwitchingToAuto(true)
      setDeadlineSheet(true)
    }
  }

  // 번복(다시 정리하기): 정리완료·결정 표시 해제 + 마감일·결정방식 초기화(RPC 019와 동일) → 정리중,
  // 이어서 결정 방식 모달을 띄워 사용자가 방식부터 다시 고르게 한다.
  function handleReopen() {
    reopenBox.mutate(undefined, {
      onSuccess: () => {
        setBox(prev => ({ ...prev, closed_at: null, deadline_at: null, decision_mode: 'manual' }))
        setConfirmReopen(false)
        openModeModal('manual')
      },
    })
  }

  // 결정: 선택지 1개 이상 골라 확정
  function openDecide() {
    setSelected(new Set(leaderIds))   // 좋아요 1위 미리 선택
    setDeciding(true)
  }
  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  function handleDecide() {
    const ids = [...selected]
    if (ids.length === 0) return
    decideBox.mutate(ids, {
      onSuccess: () => {
        setBox(prev => ({ ...prev, closed_at: new Date().toISOString() }))
        setDeciding(false)
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
        right={<AppDrawer nickname={myNickname} />}
      />

      {/* 상자 나가기 확인 — 혼자인 상자는 나가면 삭제됨 */}
      {confirmLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmLeave(false)} />
          <div className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="text-[15px] font-extrabold text-ink">
              {isSolo ? '상자를 삭제할까요?' : '상자에서 나갈까요?'}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              {isSolo
                ? '나 혼자 있는 상자예요. 나가면 선택지·투표·댓글이 모두 사라져요. 되돌릴 수 없어요.'
                : '내 목록에서 사라져요. 다시 참여하려면 초대가 필요해요. (마지막 한 명이 나가면 상자가 삭제돼요.)'}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={() => leaveBox.mutate(box.id)}
                disabled={leaveBox.isPending}
                className="flex-1 rounded-field bg-tomato py-3 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {isSolo ? '삭제하기' : '나가기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공유 서랍 담기 확인 — 멤버 전원이 이 상자를 보게 되는 유출 방지 */}
      {confirmShareFolder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmShareFolder(null)} />
          <div className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="break-keep text-[15px] font-extrabold text-ink">함께 쓰는 서랍이에요</p>
            <p className="mt-1.5 break-keep text-[12.5px] leading-relaxed text-ink-soft">
              &lsquo;{confirmShareFolder.name}&rsquo; 서랍을 함께 쓰는{' '}
              <span className="font-bold text-ink">{confirmShareFolder.count}명 모두</span>에게 이 상자가 공유돼요. 계속할까요?
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmShareFolder(null)}
                className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={() => { applyFolder(confirmShareFolder.id); setConfirmShareFolder(null) }}
                className="flex-1 rounded-field bg-ink py-3 text-[13px] font-bold text-cream"
              >
                담기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 결정 방식 변경 (참여자 누구나) */}
      {modeModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setModeModal(false)} />
          <div className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <div className="mb-3">
              <h3 className="text-base font-extrabold tracking-tight text-ink">결정 방식 변경</h3>
            </div>
            <div className="space-y-2">
              {DECISION_MODES.map(m => {
                const active = selectedMode === m.value
                return (
                  <button
                    key={m.value}
                    onClick={() => setSelectedMode(m.value)}
                    className={`flex w-full items-start gap-2.5 rounded-field border-[1.5px] px-4 py-3 text-left transition-colors ${
                      active ? 'border-butter-dark bg-butter-tint' : 'border-line bg-paper'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${active ? 'border-butter-dark bg-butter' : 'border-[#C9C7B6]'}`}>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{m.label}</span>
                      <span className="block text-[12px] text-ink-soft">{m.sub}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-[11.5px] text-ink-faint">마감 투표로 바꾸면 마감일을 정하게 돼요.</p>
            <button
              onClick={() => chooseMode(selectedMode)}
              disabled={updateDecisionMode.isPending}
              className="mt-4 w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
            >
              {updateDecisionMode.isPending ? '적용 중...' : '확인'}
            </button>
          </div>
        </div>
      )}

      {/* 폴더 지정 (개인별 — 참여자 누구나 자기 폴더에) — 주제별 상자 묶음 §3-7 */}
      {folderModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setFolderModal(false)} />
          <div className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <h3 className="mb-1 text-base font-extrabold tracking-tight text-ink">서랍에 담기</h3>
            <p className="mb-3 text-[12px] text-ink-soft">여러 서랍에 담을 수 있어요. 함께 쓰는 서랍에 넣으면 그 서랍 멤버 모두 이 상자에 참여해요.</p>

            <div className="max-h-[46vh] space-y-1 overflow-y-auto">
              {folders.length === 0 && (
                <p className="px-3 py-6 text-center text-[13px] text-ink-faint">아직 서랍이 없어요. 아래에서 만들어보세요.</p>
              )}
              {folders.map(f => {
                const checked = myFolderIds.includes(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFolder(f.id)}
                    aria-pressed={checked}
                    className="flex w-full items-center justify-between gap-2 rounded-[12px] px-3 py-3 text-left text-sm font-semibold text-ink active:bg-cream"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon name="folder" size={16} className="shrink-0 text-ink-soft" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                        checked ? 'border-butter-dark bg-butter' : 'border-line bg-paper'
                      }`}
                    >
                      {checked && <Icon name="check" size={13} strokeWidth={3.2} className="text-ink" />}
                    </span>
                  </button>
                )
              })}
            </div>

            <form
              onSubmit={e => {
                e.preventDefault()
                const n = folderNameInput.trim()
                if (!n || createFolder.isPending) return
                createFolder.mutate(n, {
                  onSuccess: folder => {
                    setFolderNameInput('')
                    setFolders.mutate([...myFolderIds, folder.id])
                  },
                })
              }}
              className="mt-3 flex gap-2 border-t border-line pt-3"
            >
              <input
                value={folderNameInput}
                onChange={e => setFolderNameInput(e.target.value)}
                placeholder="새 서랍 만들기"
                maxLength={20}
                className="min-w-0 flex-1 rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
              />
              <button
                type="submit"
                disabled={!folderNameInput.trim() || createFolder.isPending}
                className="shrink-0 rounded-field bg-ink px-4 py-2.5 text-sm font-bold text-cream disabled:opacity-50"
              >
                만들기
              </button>
            </form>

            {/* 체크 즉시 자동 저장이라 별도 확인이 없다 → '완료'로 끝맺음을 명확히 준다. */}
            <button
              onClick={() => setFolderModal(false)}
              className="mt-4 w-full rounded-field bg-butter py-3.5 text-sm font-extrabold text-ink active:opacity-80"
            >
              완료
            </button>
          </div>
        </div>
      )}

      {/* 결정 모달 (직접 정하기) */}
      {deciding && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setDeciding(false)} />
          <div className="relative mx-auto flex max-h-[75vh] w-full max-w-[430px] flex-col rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-extrabold tracking-tight text-ink">무엇으로 정할까요?</h3>
              <button onClick={() => setDeciding(false)} className="text-[13px] text-ink-faint">닫기</button>
            </div>
            <p className="mb-3 text-[12px] text-ink-soft">
              여러 개 골라도 돼요{showLikes && leaderNames.length > 0 ? ' · 좋아요 1위를 미리 골라놨어요' : ''}.
            </p>
            <div className="flex-1 space-y-2 overflow-y-auto">
              {options.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">선택지를 먼저 추가해주세요.</p>
              ) : (
                options.map(o => {
                  const on = selected.has(o.id)
                  return (
                    <button
                      key={o.id}
                      onClick={() => toggleSelect(o.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-field border-[1.5px] px-4 py-3 text-left transition-colors ${
                        on ? 'border-butter-dark bg-butter-tint' : 'border-line bg-paper'
                      }`}
                    >
                      <span className="min-w-0 truncate text-sm font-bold text-ink">{o.name}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {showLikes && <span className="text-[12px] font-bold text-ink-faint">♥ {likeOf(o.id)}</span>}
                        <span className={`flex h-5 w-5 items-center justify-center rounded-[6px] border-[1.5px] ${on ? 'border-butter-dark bg-butter text-ink' : 'border-[#C9C7B6]'}`}>
                          {on && <Icon name="check" size={12} strokeWidth={3} />}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
            <button
              onClick={handleDecide}
              disabled={selected.size === 0 || decideBox.isPending}
              className="mt-4 w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-40"
            >
              {decideBox.isPending ? '정하는 중...' : `이걸로 정하기${selected.size > 0 ? ` (${selected.size}개)` : ''}`}
            </button>
          </div>
        </div>
      )}

      <div className={`flex-1 space-y-4 px-5 pt-1 ${options.length > 0 ? 'pb-28' : 'pb-5'}`}>
        {/* 히어로: 상태 · 질문 · 메모 · 메타 · 참여 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[status]}`}>
              {BOX_STATUS_LABEL[status]}
            </span>
            {/* 상자 액션 — 헤더 대신 뱃지 줄로(토스 시스템 버튼 겹침 회피 + 긴 제목 폭 확보): 즐겨찾기·링크·편집. */}
            {!editingTitle && (
              <div className="flex shrink-0 items-center gap-0.5">
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
                {hasLinks && (
                  <AppLink
                    href={`/box/${box.id}/links`}
                    aria-label="링크 모아보기"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink active:bg-butter-tint"
                  >
                    <Icon name="paperclip" size={20} />
                  </AppLink>
                )}
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    aria-label="상자 메뉴"
                    className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft active:bg-butter-tint active:text-ink"
                  >
                    <Icon name="more" size={20} />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-[14px] border border-line bg-paper py-1 shadow-[0_8px_24px_rgba(42,42,39,0.16)]">
                        {/* '링크로 초대'는 참여자 영역 탭으로 여는 시트와 중복이라 ⋯ 메뉴에선 제거(참여자 아바타 탭으로 접근). */}
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
                        {!isDone && (
                          <button
                            onClick={() => { setMenuOpen(false); openModeModal(box.decision_mode as DecisionMode) }}
                            className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                          >
                            결정 방식 변경
                          </button>
                        )}
                        <button
                          onClick={() => { setMenuOpen(false); setFolderModal(true) }}
                          className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                        >
                          서랍에 담기
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setConfirmLeave(true) }}
                          className="block w-full border-t border-line px-4 py-2.5 text-left text-[13px] font-semibold text-tomato active:bg-tomato-tint"
                        >
                          {isSolo ? '상자 삭제' : '나가기'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {editingTitle ? (
            <div className="flex items-end gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                maxLength={50}
                autoFocus
                className="min-w-0 flex-1 border-b-[1.5px] border-butter-dark bg-transparent pb-1 text-[22px] font-extrabold leading-tight text-ink focus:outline-none"
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
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink">{box.title}</h1>
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

          {/* 마감(마감 투표만) + 참여자. 공유는 참여자 탭 → 초대 시트로 일원화(뷰어=초대 같은 링크). */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {deadlineNode}
            {participantsNode}
          </div>
        </div>

        {/* 결정 결과 (정리완료) — 들썩이는 상자처럼 버터 톤 */}
        {isDone && (
          <div className="space-y-4 rounded-card bg-butter-tint p-5">
            <div className="flex flex-col items-start gap-2.5 text-left">
              <PencilCircle>정리완료!</PencilCircle>
              {decidedOptions.length > 0 ? (
                <p className="text-[18px] font-extrabold leading-snug text-ink">
                  <span className="[box-shadow:inset_0_-9px_0_#FFD84A]">{decidedOptions.map(o => o.name).join(', ')}</span>
                  (으)로 결정!
                </p>
              ) : (
                <p className="text-[13.5px] text-ink-soft">결정 없이 마무리됐어요</p>
              )}
            </div>

            {/* 다시 정리하기 (번복) — 참여자 누구나 */}
            {confirmReopen ? (
              <div className="space-y-2.5 rounded-field bg-paper/70 p-3.5">
                <p className="text-center text-[12.5px] leading-relaxed text-ink-soft">상자를 다시 열까요? 결정이 해제돼요.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReopen(false)}
                    className="flex-1 rounded-field border border-line bg-paper py-2.5 text-[13px] font-bold text-ink-soft active:bg-cream"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleReopen}
                    disabled={reopenBox.isPending}
                    className="flex-1 rounded-field bg-ink py-2.5 text-[13px] font-bold text-cream active:opacity-80 disabled:opacity-50"
                  >
                    다시 열기
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReopen(true)}
                className="w-full rounded-field bg-ink py-3 text-[13px] font-bold text-cream active:opacity-80"
              >
                다시 정리하기
              </button>
            )}
          </div>
        )}

        {/* 지금 1위 (진행 중 · 여럿 상자) */}
        {!isDone && showLikes && leaderNames.length > 0 && (
          <p className="text-[12.5px] font-bold text-ink-soft">
            지금 1위 · <span className="text-ink">{leaderNames.join(', ')}</span>
          </p>
        )}

        <OptionsSection
          boxId={box.id}
          round={box.current_round}
          initialOptions={initialOptions}
          canVote={showLikes}
          showLikes={showLikes}
        />
      </div>

      {/* 하단 고정 2단: ＋선택지 추가하기 · 최종 결정하기. 목록 안 내려도 상시 추가(스크롤 불편 해소).
          결정 없을 때(마감투표·정리완료)는 추가가 풀폭. 0개면 목록 빈상태 CTA가 대체. */}
      {options.length > 0 && (
        <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 grid grid-cols-2 gap-2.5 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
          {!isDone && !isAuto && (
            <button
              onClick={openDecide}
              className="rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
            >
              최종 결정하기
            </button>
          )}
          <AppLink
            href={`/box/${box.id}/option/new`}
            className={`flex items-center justify-center gap-1.5 rounded-field border border-dashed border-[#D9D6C2] bg-paper/50 py-4 text-[13px] font-bold text-ink-soft active:bg-cream ${!isDone && !isAuto ? '' : 'col-span-2'}`}
          >
            <Icon name="plus" size={16} />
            선택지 추가하기
          </AppLink>
        </div>
      )}

      <DeadlineBottomSheet
        open={deadlineSheet}
        defaultValue={box.deadline_at ? new Date(box.deadline_at) : defaultDeadline()}
        onClose={() => { setDeadlineSheet(false); setSwitchingToAuto(false) }}
        onConfirm={handleDeadlineConfirm}
      />

      {/* ① 참여자 시트 — 참여 중인 사람 목록 보기 + '초대하기' 진입 */}
      {membersOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setMembersOpen(false)} />
          <div className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <p className="text-[15px] font-extrabold text-ink">
              {isDone ? `함께한 사람 ${box.box_participants.length}명` : `참여 중 ${box.box_participants.length}명`}
            </p>
            <div className="mb-4 mt-3 max-h-[50vh] space-y-2.5 overflow-y-auto">
              {box.box_participants.map(p => (
                <div key={p.user_id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-butter-tint text-[11px] font-bold text-ink">
                    {p.profiles?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.profiles.avatar_url} alt={p.profiles?.nickname ?? ''} className="h-full w-full object-cover" />
                    ) : (
                      p.profiles?.nickname?.[0] ?? '?'
                    )}
                  </div>
                  <span className="text-sm font-semibold text-ink">{p.profiles?.nickname ?? '알 수 없음'}</span>
                </div>
              ))}
            </div>
            {!isDone && (
              <button
                onClick={() => { setMembersOpen(false); setInvitePicked(new Set()); setInviteOpen(true) }}
                className="flex w-full items-center justify-center gap-2 rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
              >
                <Icon name="plus" size={17} strokeWidth={2.4} />
                초대하기
              </button>
            )}
          </div>
        </div>
      )}

      {/* ② 초대 시트 — 함께했던 사람 바로 초대 + 링크로 초대 */}
      {inviteOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => { setInviteOpen(false); setInvitePicked(new Set()) }} />
          <div className="relative mx-auto flex max-h-[80vh] w-full max-w-[430px] flex-col rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <p className="text-[15px] font-extrabold text-ink">함께 정할 사람 초대</p>
            <p className="mb-3 mt-0.5 text-[12px] text-ink-soft">함께했던 사람은 바로, 처음이면 링크로 초대해요.</p>

            {/* 함께했던 사람 (다중 선택 → 바로 참여) */}
            <div className="min-h-[3rem] flex-1 overflow-y-auto">
              {coLoading ? (
                <p className="py-6 text-center text-[13px] text-ink-faint">불러오는 중…</p>
              ) : coParticipants.length === 0 ? (
                <p className="py-6 text-center text-[13px] text-ink-faint">함께했던 사람이 아직 없어요. 링크로 초대해요.</p>
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

            <button
              onClick={copyInvite}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-field border py-3.5 text-sm font-bold transition active:opacity-80 ${inviteCopied ? 'border-butter-dark bg-butter text-ink' : 'border-line bg-paper text-ink'}`}
            >
              <Icon name={inviteCopied ? 'check' : 'link'} size={17} />
              {inviteCopied ? '링크 복사됨!' : '링크로 초대하기'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
