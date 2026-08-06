'use client'

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBodyScrollLock } from '@/hooks/use-body-scroll-lock'
import { useNav, AppLink } from '@/lib/nav/nav'
import { requestAppReview } from '@/lib/review/native-review'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateNickname, updateAvatarUrl, uploadAvatar } from '@/lib/api/profile'
import { signOut } from '@/lib/api/auth'
import { PageHeader } from '@/components/page-header'
import { AppDrawer } from '@/components/app-drawer'

interface ProfileClientProps {
  userId: string
  nickname: string
  avatarUrl: string | null
  kakaoAvatarUrl: string | null
}

export function ProfileClient({ userId, nickname, avatarUrl, kakaoAvatarUrl }: ProfileClientProps) {
  const nav = useNav()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameValue, setNicknameValue] = useState(nickname)
  const [confirmLogout, setConfirmLogout] = useState(false)
  useBodyScrollLock(confirmLogout)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const updateNicknameMutation = useMutation({
    mutationFn: (newNickname: string) => updateNickname(newNickname),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      setEditingNickname(false)
      nav.refresh()
    },
  })

  const updateAvatarMutation = useMutation({
    mutationFn: (url: string | null) => updateAvatarUrl(url),
    onSuccess: (_, url) => {
      setCurrentAvatarUrl(url)
      setAvatarError(null)
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      nav.refresh()
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (url) => {
      setCurrentAvatarUrl(url)
      setAvatarError(null)
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      nav.refresh()
    },
    onError: () => {
      setAvatarError('사진 업로드에 실패했어요.')
    },
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('5MB 이하의 이미지만 업로드할 수 있어요.')
      return
    }
    uploadAvatarMutation.mutate(file)
    e.target.value = ''
  }

  function handleSaveNickname() {
    const trimmed = nicknameValue.trim()
    if (!trimmed || trimmed === nickname) {
      setEditingNickname(false)
      setNicknameValue(nickname)
      return
    }
    updateNicknameMutation.mutate(trimmed)
  }

  async function handleLogout() {
    await signOut()
    nav.replace('/login') // 로그아웃 후 앱으로 back하면 인증가드 리다이렉트 → 교체
  }

  const isAvatarPending = updateAvatarMutation.isPending || uploadAvatarMutation.isPending
  const displayInitial = nickname[0] ?? '?'
  const isUsingKakaoAvatar = !!currentAvatarUrl && currentAvatarUrl === kakaoAvatarUrl

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="프로필 관리" right={<AppDrawer nickname={nickname} />} />

      <div className="flex-1 space-y-3 px-5 pb-6 pt-1">
        {/* 프로필 사진 */}
        <div className="flex flex-col items-center gap-4 rounded-card border border-[#ECEADC] bg-paper p-5">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAvatarPending}
            className="group relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-butter-tint"
          >
            {currentAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={currentAvatarUrl} alt={nickname} className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-extrabold text-ink">{displayInitial}</span>
            )}
            <div className={`absolute inset-0 flex items-center justify-center bg-ink/30 transition-opacity ${isAvatarPending ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-active:opacity-100'}`}>
              {isAvatarPending ? (
                <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <p className="text-xs text-ink-faint">사진을 탭하면 변경할 수 있어요</p>

          <div className="flex gap-3">
            {kakaoAvatarUrl && !isUsingKakaoAvatar && (
              <button
                onClick={() => updateAvatarMutation.mutate(kakaoAvatarUrl)}
                disabled={isAvatarPending}
                className="text-sm font-semibold text-ink disabled:opacity-50"
              >
                카카오 프로필로 변경
              </button>
            )}
            {currentAvatarUrl && (
              <>
                {kakaoAvatarUrl && !isUsingKakaoAvatar && (
                  <span className="text-line">|</span>
                )}
                <button
                  onClick={() => updateAvatarMutation.mutate(null)}
                  disabled={isAvatarPending}
                  className="text-sm font-semibold text-ink-faint disabled:opacity-50"
                >
                  기본 프로필로 변경
                </button>
              </>
            )}
          </div>

          {avatarError && <p className="text-xs text-tomato">{avatarError}</p>}
        </div>

        {/* 닉네임 */}
        <div className="space-y-3 rounded-card border border-[#ECEADC] bg-paper p-5">
          <h2 className="text-[13.5px] font-extrabold text-ink">닉네임</h2>
          {editingNickname ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={nicknameValue}
                onChange={e => setNicknameValue(e.target.value)}
                maxLength={20}
                autoFocus
                className="min-w-0 flex-1 rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-butter-dark focus:outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveNickname()
                  if (e.key === 'Escape') {
                    setEditingNickname(false)
                    setNicknameValue(nickname)
                  }
                }}
              />
              <button
                onClick={handleSaveNickname}
                disabled={updateNicknameMutation.isPending || !nicknameValue.trim()}
                className="shrink-0 rounded-field bg-ink px-4 py-2.5 text-sm font-bold text-cream disabled:opacity-50"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditingNickname(false)
                  setNicknameValue(nickname)
                }}
                className="shrink-0 rounded-field border border-line px-4 py-2.5 text-sm font-bold text-ink-soft"
              >
                취소
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink">{nickname}</span>
              <button
                onClick={() => setEditingNickname(true)}
                className="text-sm font-semibold text-ink"
              >
                변경
              </button>
            </div>
          )}
          {updateNicknameMutation.isError && (
            <p className="text-xs text-tomato">닉네임 변경에 실패했어요.</p>
          )}
        </div>

        {/* 알림 설정 (토스 전용 — 웹은 /settings 라우트 없음) */}
        {nav.platform === 'toss' && (
          <AppLink
            href="/settings/notifications"
            className="flex items-center justify-between overflow-hidden rounded-card border border-[#ECEADC] bg-paper px-5 py-4 text-sm text-ink active:bg-cream"
          >
            <span>알림 설정</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </AppLink>
        )}

        {/* 이용후기 (토스 네이티브 리뷰 — 피로도 정책상 항상 뜨진 않음) */}
        {nav.platform === 'toss' && (
          <button
            type="button"
            onClick={() => requestAppReview()}
            className="flex w-full items-center justify-between overflow-hidden rounded-card border border-[#ECEADC] bg-paper px-5 py-4 text-sm text-ink active:bg-cream"
          >
            <span>이용후기 남기기 💖</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* 계정 */}
        <div className="overflow-hidden rounded-card border border-[#ECEADC] bg-paper">
          <button
            onClick={() => setConfirmLogout(true)}
            className="flex w-full items-center justify-between px-5 py-4 text-sm text-ink active:bg-cream"
          >
            <span>로그아웃</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="border-t border-line" />
          <AppLink
            href="/profile/withdraw"
            className="flex items-center justify-between px-5 py-4 text-sm text-tomato active:bg-cream"
          >
            <span>탈퇴하기</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </AppLink>
        </div>
      </div>

      {/* 로그아웃 확인 모달 — createPortal(body): 탭바·조상 스택 영향 없이 최상위에 뜬다. */}
      {confirmLogout && createPortal(
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmLogout(false)} />
          <div className="relative mx-auto w-full max-w-[430px] space-y-4 rounded-t-sheet bg-paper px-5 pb-[calc(env(safe-area-inset-bottom)+2.5rem)] pt-6">
            <p className="text-center text-base font-extrabold text-ink">로그아웃 하시겠어요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 rounded-field border border-line py-3.5 text-sm font-bold text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-field bg-ink py-3.5 text-sm font-bold text-cream"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </main>
  )
}
