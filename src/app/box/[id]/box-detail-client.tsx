'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNav, AppLink } from '@/lib/nav/nav'
import {
  useUpdateBoxTitle,
  useUpdateBoxMemo,
  useUpdateBoxDeadline,
  useUpdateBoxDecisionMode,
  useUpdateBoxCheckable,
  useDecideBox,
  useLeaveBox,
  useReopenBox,
  useJoinBox,
  useSwitchBoxMode,
} from '@/hooks/use-boxes'
import { useToggleFavorite } from '@/hooks/use-favorites'
import { useFolders, useMyBoxFolders, useSetBoxFolders, useCreateFolder } from '@/hooks/use-folders'
import { useOptions } from '@/hooks/use-options'
import { useBoxVotes } from '@/hooks/use-votes'
import { useCoParticipants, useInviteUsersToBox } from '@/hooks/use-invites'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { DeadlineBottomSheet } from '@/components/deadline-bottom-sheet'
import { OptionsSection } from '@/components/options-section'
import { Icon } from '@/components/icon'
import { AppDrawer } from '@/components/app-drawer'
import { PageHeader } from '@/components/page-header'
import { PencilCircle } from '@/components/pencil-circle'
import { shareInviteLink, hasNativeShare } from '@/lib/share/native-share'
import { getBoxStatus, isDoneStatus } from '@/lib/domain/box-status'
import { parseBlocks, linkBlocksOf } from '@/lib/domain/option-content'
import { setBoxVisibility, requestToJoin, getMyHandle, claimHandle } from '@/lib/api/social'
import { setBoxFolderShared } from '@/lib/api/folders'
import { formatDeadlineCompact, defaultDeadline, formatKoreanDate, errorMessage } from '@/lib/utils'
import type { BoxWithParticipants, BoxParticipant, DecisionMode } from '@/lib/api/boxes'
import type { Option } from '@/lib/api/options'
import type { JoinRequestStatus } from '@/lib/api/box-detail'

interface BoxDetailClientProps {
  box: BoxWithParticipants
  currentUserId: string
  initialOptions: Option[]
  initialIsFavorite: boolean
  /** 048: 서랍 접근·049: 공개 상자 열람으로 읽기 전용 조회 중이면 false — 편집·투표는 숨기고 하단에 참여 CTA를 보여준다. */
  isParticipant: boolean
  /** 049: true면 서랍 접근이라 '함께하기'(즉시 참여). false면 공개 상자 열람이라 '함께하기 신청'(승인제, 041)만 가능. */
  canInstantJoin: boolean
  /** 049: 비참여자가 이미 참여 신청을 넣었는지(승인제) */
  joinRequestStatus: JoinRequestStatus
  /** 웹 전용 카카오 공유 버튼(초대 시트 안). 토스는 넘기지 않음(undefined) — 공유 코드에 process.env·Kakao 미포함 유지. */
  kakaoInvite?: ReactNode
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

export function BoxDetailClient({
  box: initialBox,
  currentUserId,
  initialOptions,
  initialIsFavorite,
  isParticipant,
  canInstantJoin,
  joinRequestStatus,
  kakaoInvite,
}: BoxDetailClientProps) {
  const nav = useNav()
  const isLoggedIn = !!currentUserId
  const [requested, setRequested] = useState(joinRequestStatus === 'pending')
  const [requestBusy, setRequestBusy] = useState(false)

  const queryClient = useQueryClient()
  const [box, setBox] = useState(initialBox)
  // 재진입/refetch로 참여자가 바뀌면(다른 사람이 나감/들어옴) 로컬 box에 반영.
  // 참여자만 동기화 — 제목·메모 등 로컬 편집 중인 필드는 덮지 않는다.
  useEffect(() => {
    setBox(prev => ({ ...prev, box_participants: initialBox.box_participants }))
  }, [initialBox.box_participants])
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
  const [confirmSwitchMode, setConfirmSwitchMode] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [folderModal, setFolderModal] = useState(false)
  // 공개 설정(개편) — 타입 미생성이라 캐스팅. box.visibility/tags는 037 이후 존재.
  const [publishOpen, setPublishOpen] = useState(false)
  const [publicOn, setPublicOn] = useState(((box as unknown as { visibility?: string }).visibility) === 'public')
  const [tagInput, setTagInput] = useState(((box as unknown as { tags?: string[] }).tags ?? []).join(', '))
  const [publishBusy, setPublishBusy] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null) // 공개 실패 사유
  const isPublic = ((box as unknown as { visibility?: string }).visibility) === 'public'
  const publicTags = ((box as unknown as { tags?: string[] }).tags ?? [])

  // 057: 공개하려면 @handle이 있어야 한다 — 시트 열렸을 때만 조회. 없으면 토글이 아예 안 먹고
  // 이 자리에서 바로 아이디를 만들 수 있게 한다(프로필로 안 보내고 이 화면에서 완결).
  const { data: myHandle } = useQuery({
    queryKey: ['my-handle', currentUserId],
    queryFn: getMyHandle,
    enabled: publishOpen,
  })
  const [handleValue, setHandleValue] = useState('')
  const [handleError, setHandleError] = useState<string | null>(null)
  const claimHandleMutation = useMutation({
    mutationFn: (h: string) => claimHandle(h),
    onSuccess: () => {
      setHandleError(null)
      setHandleValue('')
      queryClient.invalidateQueries({ queryKey: ['my-handle', currentUserId] })
      setPublicOn(true) // 아이디가 막 생겼으니 이어서 공개로 전환
    },
    onError: (e: unknown) => setHandleError(errorMessage(e, '아이디 설정에 실패했어요')),
  })

  async function savePublish() {
    if (publishBusy) return
    setPublishBusy(true)
    setPublishError(null)
    const tags = tagInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 8)
    try {
      await setBoxVisibility(box.id, publicOn, tags)
      setBox(prev => ({ ...prev, visibility: publicOn ? 'public' : 'private', tags } as unknown as typeof prev))
      setPublishOpen(false)
      // 공개 여부 변경 → 탐색 피드·내 프로필(공개 그리드/카운트) 최신화. 웹 클라 쿼리 + RSC 둘 다.
      queryClient.invalidateQueries({ queryKey: ['public-feed'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['public-search'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['my-profile'], refetchType: 'all' })
      queryClient.invalidateQueries({ queryKey: ['profile-feed'], refetchType: 'all' })
      nav.refresh()
    } catch (e) {
      // 예: '공개하려면 아이디(@handle)를 먼저 설정해주세요'(057) — 시트 유지 + 사유 표시.
      setPublishError(errorMessage(e, '저장에 실패했어요. 다시 시도해주세요.'))
    } finally {
      setPublishBusy(false)
    }
  }
  const [folderNameInput, setFolderNameInput] = useState('')
  // 폴더별 '나만보기' 미리 설정 — 담기 시트 인라인 스위치. 기본 공개(false). 함께 쓰는 서랍+혼자 상자일 때만 노출.
  const [privateByFolder, setPrivateByFolder] = useState<Record<string, boolean>>({})
  const [inviteOpen, setInviteOpen] = useState(false)
  const [invitePicked, setInvitePicked] = useState<Set<string>>(new Set())
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [deciding, setDeciding] = useState(false)
  useBodyScrollLock(
    membersOpen || inviteOpen || folderModal || modeModal || deadlineSheet || deciding ||
    confirmLeave || confirmReopen || confirmSwitchMode || publishOpen,
  )
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
  const updateCheckable = useUpdateBoxCheckable(box.id)
  const decideBox = useDecideBox(box.id)
  const leaveBox = useLeaveBox()
  const reopenBox = useReopenBox(box.id)
  const switchMode = useSwitchBoxMode(box.id)
  const joinBox = useJoinBox(box.id)
  const toggleFavorite = useToggleFavorite(box.id)
  const { data: folders = [] } = useFolders()
  const { data: myBoxFolders = [] } = useMyBoxFolders(box.id)
  const myFolderIds = myBoxFolders.map(f => f.folderId)
  // 서버의 링크별 shared(공유/나만) — '나만보기' 스위치 초기값 시드용.
  const sharedByFolderServer = new Map(myBoxFolders.map(f => [f.folderId, f.shared]))
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
  const isChecklist = box.mode === 'checklist'        // 모아보기 상자(§033) — 좋아요·1위·마감·결정 UI 전부 숨김
  const checkable = isChecklist && ((box as unknown as { checkable?: boolean }).checkable ?? false) // 항목 체크 사용(044)
  const isAuto = !isChecklist && box.decision_mode === 'auto_deadline'
  const showLikes = !isSolo && !isChecklist           // 혼자 상자·체크형 상자는 좋아요 미표시
  // 하단 1차 액션(최종 결정하기/정리완료로 표시) 노출 여부 — 없으면 추가 버튼이 풀폭이 된다.
  // 결정형은 마감투표(auto)여도 '최종 결정하기'로 즉시 수동 마감 가능(521efda) → 진행 중이면 항상 노출.
  // 048: 참여자만(읽기 전용 조회자는 결정할 수 없음).
  const showPrimaryAction = !isDone && isParticipant

  // 폴더 지정/해제 (018: 다중 선택 토글, 모달 유지). 무효화로 체크 갱신.
  function applyFolder(folderId: string, shared = true) {
    const set = new Set(myFolderIds)
    if (set.has(folderId)) set.delete(folderId)
    else set.add(folderId)
    setFolders.mutate({ ids: Array.from(set), sharedByFolder: { [folderId]: shared } })
  }

  // 담기 토글 — 담을 땐 그 서랍의 '나만보기' 미리설정값(privateByFolder)을 shared로 반영한다.
  // (함께 쓰는 서랍+혼자 상자만 나만보기가 의미 있고, 그 경우 시트의 인라인 스위치로 미리 고른다.)
  function toggleFolderInSheet(folderId: string) {
    const isPrivate = privateByFolder[folderId] ?? false
    applyFolder(folderId, !isPrivate)
  }

  // 나만보기 스위치 변경 — 이미 담긴 서랍이면 멤버십은 유지한 채 공유 설정만 즉시 갱신한다.
  // ⚠️ setBoxFolders(=setFolders)는 이미 있는 링크를 ignoreDuplicates로 건너뛰어 shared가 안 바뀐다.
  //    반드시 전용 setBoxFolderShared로 갱신해야 실제 공개 여부가 서버에 반영된다(프라이버시).
  function setFolderPrivate(folderId: string, isPrivate: boolean) {
    setPrivateByFolder(prev => ({ ...prev, [folderId]: isPrivate }))
    if (myFolderIds.includes(folderId)) {
      setBoxFolderShared(folderId, box.id, !isPrivate)
        .then(() => queryClient.invalidateQueries({ queryKey: ['boxFolder', box.id] }))
        .catch(() => setPrivateByFolder(prev => ({ ...prev, [folderId]: !isPrivate }))) // 실패 시 스위치 원복
    }
  }

  const decidedOptions = options.filter(o => o.decided_at)
  const likeOf = (id: string) => votes[id]?.like ?? 0
  const maxLikes = options.reduce((m, o) => Math.max(m, likeOf(o.id)), 0)
  // 결정 시트 미리선택용 — 좋아요 최다(동점 포함) 전부.
  const leaderIds = maxLikes > 0 ? options.filter(o => likeOf(o.id) === maxLikes).map(o => o.id) : []

  const inviteButton = (
    <div className="flex h-7 items-center gap-0.5 rounded-full border-2 border-cream bg-butter pl-1.5 pr-2.5 text-[12px] font-extrabold text-ink shadow-[0_1px_0_#E3B93A]">
      <Icon name="plus" size={13} strokeWidth={2.4} />
      초대
    </div>
  )

  // 마감 칩은 '마감 투표' 상자에서만 (직접 정하기 상자는 마감 없음). 참여자만 수정 가능.
  const deadlineNode = !isAuto ? null : !isDone && isParticipant ? (
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
    // 웹·토스 공통: 아바타/초대 탭 → 멤버 시트(참여자 목록 + 초대). 웹도 토스와 동일하게 통일.
    // (기존 웹 전용 /box/[id]/invite 카카오 페이지 경유는 폐기 — 카카오 공유는 초대 시트 안으로 이동.)
    return (
      <button onClick={() => setMembersOpen(true)} aria-label={label} className="inline-flex rounded-full active:opacity-70">
        {children}
      </button>
    )
  }

  // 혼자 상자: 아바타 숨기고 초대 버튼만 (마감된 혼자 상자·읽기 전용 조회자는 초대 버튼 안 보임)
  const participantsNode = isSolo
    ? (isDone || !isParticipant ? null : inviteEntry(inviteButton, '친구 초대'))
    : inviteEntry(
        <ParticipantAvatars participants={box.box_participants} trailing={isDone || !isParticipant ? undefined : inviteButton} />,
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
        // 체크형 상자는 결정 방식 개념이 없어 모달을 안 띄운다.
        if (!isChecklist) openModeModal('manual')
      },
    })
  }

  // 종류 변경(결정하기 ↔ 모아보기, 058): 결정·체크·좋아요 기록 전부 초기화 + 정리완료 해제.
  function handleSwitchMode() {
    const nextMode = isChecklist ? 'decide' : 'checklist'
    switchMode.mutate(nextMode, {
      onSuccess: () => {
        setBox(prev => ({ ...prev, mode: nextMode, checkable: false, decision_mode: 'manual', deadline_at: null, closed_at: null } as unknown as typeof prev))
        setConfirmSwitchMode(false)
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

  // 049: 비로그인 방문자가 참여·신청·북마크처럼 실제 상호작용을 시도하면 그때 로그인으로 유도.
  function requireLogin(): boolean {
    if (isLoggedIn) return true
    if (nav.platform === 'toss' && nav.login) { nav.login() } else { nav.push(`/login?next=/box/${box.id}`) }
    return false
  }

  function handleToggleFavorite() {
    if (!requireLogin()) return
    setIsFavorite(prev => !prev)
    toggleFavorite.mutate(isFavorite, {
      onError: () => setIsFavorite(prev => !prev),
    })
  }

  function handleJoinOrRequest() {
    if (!requireLogin()) return
    if (canInstantJoin) { joinBox.mutate(); return }
    if (requestBusy || requested) return
    setRequestBusy(true)
    requestToJoin(box.id)
      .then(() => setRequested(true))
      .catch(() => setRequested(true)) // 이미 신청/참여 등도 사용자에게는 '신청됨'으로 보여준다
      .finally(() => setRequestBusy(false))
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader
        fallbackHref={isDone ? '/done' : '/messy'}
        right={<AppDrawer nickname={myNickname} isLoggedIn={isLoggedIn} />}
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

      {/* 종류 변경 확인 (058) — 결정·체크·좋아요 기록이 전부 초기화되는 되돌릴 수 없는 작업이라 확인받는다. */}
      {confirmSwitchMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmSwitchMode(false)} />
          <div className="relative w-full max-w-[320px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="text-[15px] font-extrabold text-ink">
              {isChecklist ? '결정하기' : '모아보기'}(으)로 바꿀까요?
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              {isChecklist
                ? '체크한 항목이 전부 해제돼요.'
                : '좋아요·결정 기록이 전부 사라져요.'}{' '}
              정리완료 상태도 풀려요. 되돌릴 수 없어요.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmSwitchMode(false)}
                className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={handleSwitchMode}
                disabled={switchMode.isPending}
                className="flex-1 rounded-field bg-tomato py-3 text-[13px] font-bold text-white disabled:opacity-50"
              >
                {switchMode.isPending ? '바꾸는 중...' : '바꾸기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 공개 설정 — 프로필/탐색에 노출. 여럿 상자는 공개 시 남 신원이 가려져 보인다(익명화). */}
      {publishOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setPublishOpen(false)} />
          <div className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <h3 className="mb-1 text-base font-extrabold tracking-tight text-ink">공개 설정</h3>
            <p className="mb-4 text-[12px] leading-relaxed text-ink-soft">
              공개하면 내 프로필과 둘러보기에 노출돼요. {!isSolo && '여럿이 참여한 상자는 다른 참여자 이름·프로필이 가려진 채 보여요.'}
            </p>

            <button
              type="button"
              onClick={() => {
                // 057: 아이디(@handle) 없으면 공개로 못 넘어간다 — 토글이 아예 안 먹고 아래 아이디 만들기로 유도.
                if (!publicOn && myHandle === null) return
                setPublicOn(v => !v)
              }}
              className="flex w-full items-center justify-between rounded-field border-[1.5px] border-line bg-paper px-4 py-3"
            >
              <span className="text-[14px] font-bold text-ink">{publicOn ? '공개' : '비공개'}</span>
              <span className={`relative h-6 w-10 rounded-full transition-colors ${publicOn ? 'bg-ink' : 'bg-line'}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper transition-all ${publicOn ? 'left-[18px]' : 'left-0.5'}`} />
              </span>
            </button>

            {/* 아이디 없으면 공개 전환 자체가 막힌다 — 프로필로 안 보내고 여기서 바로 만들게. */}
            {!publicOn && myHandle === null && (
              <div className="mt-3 space-y-2 rounded-field border-[1.5px] border-dashed border-butter-dark bg-butter-tint/40 p-3.5">
                <p className="text-[12.5px] font-bold text-ink">공개하려면 아이디(@)가 먼저 필요해요</p>
                <div className="flex gap-2">
                  <div className="flex min-w-0 flex-1 items-center rounded-field border-[1.5px] border-line bg-paper pl-3.5 focus-within:border-butter-dark">
                    <span className="text-sm text-ink-faint">@</span>
                    <input
                      type="text"
                      value={handleValue}
                      onChange={e => setHandleValue(e.target.value.toLowerCase())}
                      placeholder="myid"
                      maxLength={20}
                      className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-ink focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => claimHandleMutation.mutate(handleValue.trim())}
                    disabled={claimHandleMutation.isPending || handleValue.trim().length < 3}
                    className="shrink-0 rounded-field bg-ink px-4 py-2.5 text-sm font-bold text-cream disabled:opacity-50"
                  >
                    {claimHandleMutation.isPending ? '만드는 중…' : '만들기'}
                  </button>
                </div>
                <p className="text-[11px] text-ink-faint">소문자·숫자·밑줄 3~20자</p>
                {handleError && <p className="text-[11px] font-semibold text-tomato">{handleError}</p>}
              </div>
            )}

            {publicOn && (
              <div className="mt-3">
                <label className="mb-1.5 block text-[12px] font-semibold text-ink-soft">태그 (쉼표로 구분, 최대 8개)</label>
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="예: 맛집, 여행, 쇼핑"
                  className="w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
                />
              </div>
            )}

            {publishError && <p className="mt-3 text-[12.5px] font-semibold text-tomato">{publishError}</p>}

            <button
              onClick={savePublish}
              disabled={publishBusy}
              className="mt-4 w-full rounded-field bg-ink py-3.5 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
            >
              {publishBusy ? '저장 중...' : '저장'}
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
                // 로컬 토글값이 있으면 그것(즉시 반영), 없으면 이미 담긴 서랍은 서버 shared에서 시드,
                // 아직 안 담은 서랍은 기본 공개(false).
                const isPrivate = privateByFolder[f.id] ?? (checked ? !(sharedByFolderServer.get(f.id) ?? true) : false)
                // 나만보기는 함께 쓰는 서랍(2명+) + 혼자 상자일 때만 의미 있다.
                const canPrivate = f.member_count > 1 && isSolo
                return (
                  <div key={f.id} className="flex w-full items-center justify-between gap-2 rounded-[12px] px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => toggleFolderInSheet(f.id)}
                      aria-pressed={checked}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-semibold text-ink active:opacity-70"
                    >
                      <Icon name="folder" size={16} className="shrink-0 text-ink-soft" />
                      <span className="truncate">{f.name}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-2.5">
                      {canPrivate && (
                        <button
                          type="button"
                          onClick={() => setFolderPrivate(f.id, !isPrivate)}
                          aria-pressed={isPrivate}
                          className="flex items-center gap-1.5"
                        >
                          <span className="text-[11px] font-bold text-ink-soft">나만보기</span>
                          <span className={`relative h-5 w-9 rounded-full transition-colors ${isPrivate ? 'bg-ink' : 'bg-[#D9D6C2]'}`}>
                            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-paper shadow-sm transition-all ${isPrivate ? 'left-[18px]' : 'left-0.5'}`} />
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleFolderInSheet(f.id)}
                        aria-pressed={checked}
                        aria-label={checked ? '서랍에서 빼기' : '서랍에 담기'}
                        className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                          checked ? 'border-butter-dark bg-butter' : 'border-line bg-paper'
                        }`}
                      >
                        {checked && <Icon name="check" size={13} strokeWidth={3.2} className="text-ink" />}
                      </button>
                    </div>
                  </div>
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
                    setFolders.mutate({ ids: [...myFolderIds, folder.id] })
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
              여러 개 골라도 돼요{showLikes && leaderIds.length > 0 ? ' · 좋아요 많은 걸 미리 골라놨어요' : ''}.
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
          {/* 모드 라벨이 있던 자리 = 공개 여부·태그. 좌측은 flex-wrap이라 우측 액션에 닿으면 태그가 줄바꿈된다.
              items-start로 첫 줄을 위에 맞추고(여러 줄 태그 대응), 액션 버튼은 h-7로 줄여 칩 높이와 맞춘다
              (h-9면 아이콘이 칩보다 아래·붕 떠 보였다). */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {isParticipant && (
                <button
                  onClick={() => setPublishOpen(true)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-xs font-bold active:bg-cream ${
                    isPublic ? 'border border-line bg-paper text-ink-soft' : 'border border-dashed border-[#D9D6C2] text-ink-faint'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isPublic ? 'bg-leaf' : 'bg-ink-faint'}`} />
                  {isPublic ? '공개중' : '비공개'}
                </button>
              )}
              {isPublic && publicTags.map(t => (
                isParticipant ? (
                  <button
                    key={t}
                    onClick={() => setPublishOpen(true)}
                    className="inline-flex items-center rounded-full border border-line bg-cream px-2.5 py-[3px] text-xs font-bold text-ink-soft active:bg-butter-tint/50"
                  >
                    <span className="mr-0.5 text-ink-faint">#</span>{t}
                  </button>
                ) : (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full border border-line bg-cream px-2.5 py-[3px] text-xs font-bold text-ink-soft"
                  >
                    <span className="mr-0.5 text-ink-faint">#</span>{t}
                  </span>
                )
              ))}
              {isParticipant && isPublic && (
                <button
                  onClick={() => setPublishOpen(true)}
                  className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-[#D9D6C2] px-2.5 py-[3px] text-xs font-bold text-ink-faint active:bg-cream"
                >
                  <Icon name="plus" size={11} strokeWidth={2.4} />
                  {publicTags.length > 0 ? '태그' : '태그 추가'}
                </button>
              )}
            </div>
            {/* 상자 액션 — 북마크·공유·편집(우측 고정). */}
            {!editingTitle && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={handleToggleFavorite}
                  aria-label="북마크"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform active:scale-90"
                >
                  <Icon
                    name="bookmark"
                    size={22}
                    strokeWidth={1.6}
                    className={isFavorite ? undefined : 'text-ink-faint'}
                    style={isFavorite ? { fill: 'var(--color-butter)', stroke: 'var(--color-butter-dark)' } : undefined}
                  />
                </button>
                {/* 공유하기 — 초대 안 된 사람도 읽기전용으로 열람(＋참여) 가능한 /invite 링크를 공유·복사.
                    읽기 전용 조회자(비참여자)도 쓸 수 있게 게이트 없음(북마크 오른쪽). box.invite_code는
                    로더가 select('*')로 넘겨 공개 상자 뷰어도 보유. */}
                <button
                  onClick={copyInvite}
                  aria-label="공유하기"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-soft active:bg-butter-tint active:text-ink"
                >
                  <Icon name="share" size={19} />
                </button>
                {isParticipant && <div className="relative">
                  <button
                    onClick={() => setMenuOpen(v => !v)}
                    aria-label="상자 메뉴"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft active:bg-butter-tint active:text-ink"
                  >
                    <Icon name="more" size={20} />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-[14px] border border-line bg-paper py-1 shadow-[0_8px_24px_rgba(42,42,39,0.16)]">
                        {/* 제목은 히어로 연필, 메모 수정도 히어로 연필. 메모 '추가'(빈 상태)만 여기서. */}
                        {!box.memo && (
                          <button
                            onClick={() => { setMenuOpen(false); setEditingMemo(true); setMemoInput('') }}
                            className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                          >
                            메모 추가
                          </button>
                        )}
                        {hasLinks && (
                          <button
                            onClick={() => { setMenuOpen(false); nav.push(`/box/${box.id}/links`) }}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                          >
                            <Icon name="paperclip" size={15} className="text-ink-soft" /> 링크 모아보기
                          </button>
                        )}
                        {!isDone && !isChecklist && (
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
                          onClick={() => { setMenuOpen(false); setConfirmSwitchMode(true) }}
                          className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                        >
                          {isChecklist ? '결정하기로 바꾸기' : '모아보기로 바꾸기'}
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
                </div>}
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
              <button onClick={() => setEditingTitle(false)} aria-label="취소" className="shrink-0 pb-1 text-ink-faint active:text-ink">
                <Icon name="close" size={18} strokeWidth={2.4} />
              </button>
              <button onClick={handleSaveTitle} disabled={updateTitle.isPending} aria-label="저장" className="shrink-0 pb-1 text-ink disabled:opacity-40">
                <Icon name="check" size={18} strokeWidth={2.6} />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-1.5">
              <h1 className="min-w-0 flex-1 text-[22px] font-extrabold leading-tight tracking-tight text-ink">{box.title}</h1>
              {isParticipant && (
                <button
                  onClick={() => { setEditingTitle(true); setTitleInput(box.title) }}
                  aria-label="제목 수정"
                  className="mt-1 shrink-0 text-ink-faint active:text-ink"
                >
                  <Icon name="edit" size={16} />
                </button>
              )}
            </div>
          )}

          <p className="text-[11.5px] text-ink-faint">만든 날 {formatKoreanDate(box.created_at)}</p>

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
                <button onClick={() => setEditingMemo(false)} aria-label="취소" className="text-ink-faint active:text-ink">
                  <Icon name="close" size={17} strokeWidth={2.4} />
                </button>
                <button onClick={handleSaveMemo} disabled={updateMemo.isPending} aria-label="저장" className="text-ink disabled:opacity-40">
                  <Icon name="check" size={17} strokeWidth={2.6} />
                </button>
              </div>
            </div>
          ) : box.memo ? (
            <div className="flex items-start gap-2 rounded-[14px] border border-dashed border-[#D9D6C2] bg-paper px-3 py-2.5">
              <p className="min-w-0 flex-1 text-[12.5px] text-ink-soft">{box.memo}</p>
              {isParticipant && (
                <button
                  onClick={() => { setEditingMemo(true); setMemoInput(box.memo ?? '') }}
                  aria-label="메모 수정"
                  className="mt-0.5 shrink-0 text-ink-faint active:text-ink"
                >
                  <Icon name="edit" size={14} />
                </button>
              )}
            </div>
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
              {isChecklist ? (
                <p className="text-[13.5px] text-ink-soft">목록을 정리했어요</p>
              ) : decidedOptions.length > 0 ? (
                <p className="text-[18px] font-extrabold leading-snug text-ink">
                  <span className="[box-shadow:inset_0_-9px_0_#FFD84A]">{decidedOptions.map(o => o.name).join(', ')}</span>
                  (으)로 결정!
                </p>
              ) : (
                <p className="text-[13.5px] text-ink-soft">결정 없이 마무리됐어요</p>
              )}
            </div>

            {/* 다시 정리하기 (번복) — 참여자만 */}
            {!isParticipant ? null : confirmReopen ? (
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

        {/* 참여 신청 수락/거절은 알림함(alerts-view)에서 처리 — 상자 상세엔 두지 않는다. */}

        <OptionsSection
          boxId={box.id}
          round={box.current_round}
          initialOptions={initialOptions}
          canVote={showLikes && isParticipant}
          showLikes={showLikes}
          checklist={isChecklist}
          checkable={checkable}
          canCheck={isParticipant}
          headerAction={isChecklist && !isDone && isParticipant ? (
            // 항목 체크 사용 토글 — '항목 N개' 오른쪽 끝. 생성 후에도 껐다 켤 수 있다(낙관적 반영).
            <button
              type="button"
              onClick={() => {
                const next = !checkable
                setBox(prev => ({ ...prev, checkable: next }))
                updateCheckable.mutate(next, { onError: () => setBox(prev => ({ ...prev, checkable: !next })) })
              }}
              aria-pressed={checkable}
              className="flex shrink-0 items-center gap-1.5 text-[11.5px] font-bold text-ink-soft active:text-ink"
            >
              체크박스 사용
              <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${checkable ? 'bg-ink' : 'bg-[#D9D6C2]'}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-paper shadow-sm transition-all ${checkable ? 'left-[14px]' : 'left-0.5'}`} />
              </span>
            </button>
          ) : undefined}
        />
      </div>

      {/* 048/049: 읽기 전용 조회자는 편집 대신 참여 CTA. 서랍 접근이면 즉시 참여, 공개 상자면 승인제 신청. */}
      {!isParticipant ? (
        <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] xl:inset-x-auto xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
          <button
            onClick={handleJoinOrRequest}
            disabled={joinBox.isPending || requestBusy || (!canInstantJoin && requested)}
            className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
          >
            {canInstantJoin
              ? (joinBox.isPending ? '참여하는 중…' : '함께 정리하기')
              : requested
                ? '신청됨 · 승인 대기'
                : (requestBusy ? '신청하는 중…' : '함께 정리하기 신청')}
          </button>
        </div>
      ) : options.length > 0 && (
        /* 하단 고정 2단: ＋항목/선택지 추가하기 · 최종 결정하기(결정형)/정리완료로 표시(체크형).
           목록 안 내려도 상시 추가(스크롤 불편 해소). 액션 없을 때(정리완료)는 추가가 풀폭. 0개면 목록 빈상태 CTA가 대체.
           결정형은 마감투표(마감일)여도 '최종 결정하기'로 즉시 수동 마감 가능(521efda). */
        <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 grid grid-cols-2 gap-2.5 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] xl:inset-x-auto xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
          {/* 결정형만 하단 1차 액션. 모아보기(리스트)는 '정리완료' 개념이 없어 버튼 없음 → 추가가 풀폭. */}
          {showPrimaryAction && !isChecklist && (
            <button
              onClick={openDecide}
              className="rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
            >
              최종 결정하기
            </button>
          )}
          <AppLink
            href={`/box/${box.id}/option/new`}
            className={`flex items-center justify-center gap-1.5 rounded-field border border-dashed border-[#D9D6C2] bg-paper/50 py-4 text-[13px] font-bold text-ink-soft active:bg-cream ${showPrimaryAction && !isChecklist ? '' : 'col-span-2'}`}
          >
            <Icon name="plus" size={16} />
            {isChecklist ? '항목 추가하기' : '선택지 추가하기'}
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
            {!isDone && isParticipant && (
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
            <p className="mb-3 mt-0.5 text-[12px] text-ink-soft">전에 같이 정한 분은 바로, 처음이면 새롭게 공유로 초대해요.</p>

            {/* 함께했던 사람 (다중 선택 → 바로 참여) */}
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

            {/* 웹: 카카오톡 원탭 공유(page.tsx가 주입). 토스: undefined → 아래 네이티브 공유 시트만. */}
            {kakaoInvite}

            <button
              onClick={copyInvite}
              className={`mt-2 flex w-full items-center justify-center gap-2 rounded-field border py-3.5 text-sm font-bold transition active:opacity-80 ${inviteCopied ? 'border-butter-dark bg-butter text-ink' : 'border-line bg-paper text-ink'}`}
            >
              <Icon name={inviteCopied ? 'check' : 'link'} size={17} />
              {inviteCopied ? '링크 복사됨!' : hasNativeShare() ? '새로운 사람 초대하기' : '링크로 초대하기'}
            </button>
          </div>
        </div>
      )}

      {/* 공유 링크 복사 토스트(웹) — 토스는 네이티브 공유 시트가 뜨므로 이 토스트는 웹 복사 시에만 의미. */}
      {inviteCopied && (
        <div className="fixed inset-x-0 bottom-10 z-[70] flex justify-center px-8">
          <span className="rounded-full bg-ink px-4 py-2 text-[12.5px] font-bold text-cream shadow-lg">공유 링크 복사됨!</span>
        </div>
      )}
    </main>
  )
}
