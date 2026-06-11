'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateNickname, updateAvatarUrl, uploadAvatar } from '@/lib/api/profile'
import { signOut } from '@/lib/api/auth'

interface ProfileClientProps {
  userId: string
  nickname: string
  avatarUrl: string | null
  kakaoAvatarUrl: string | null
}

export function ProfileClient({ userId, nickname, avatarUrl, kakaoAvatarUrl }: ProfileClientProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameValue, setNicknameValue] = useState(nickname)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  const updateNicknameMutation = useMutation({
    mutationFn: (newNickname: string) => updateNickname(newNickname),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      setEditingNickname(false)
      router.refresh()
    },
  })

  const updateAvatarMutation = useMutation({
    mutationFn: (url: string | null) => updateAvatarUrl(url),
    onSuccess: (_, url) => {
      setCurrentAvatarUrl(url)
      setAvatarError(null)
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      router.refresh()
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => uploadAvatar(file),
    onSuccess: (url) => {
      setCurrentAvatarUrl(url)
      setAvatarError(null)
      queryClient.invalidateQueries({ queryKey: ['profile', userId] })
      router.refresh()
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
    router.push('/login')
  }

  const isAvatarPending = updateAvatarMutation.isPending || uploadAvatarMutation.isPending
  const displayInitial = nickname[0] ?? '?'
  const isUsingKakaoAvatar = !!currentAvatarUrl && currentAvatarUrl === kakaoAvatarUrl

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href="/" className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">프로필 관리</h1>
      </header>

      <div className="flex-1 px-5 py-6 space-y-4">
        {/* 프로필 사진 */}
        <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isAvatarPending}
            className="relative w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center group"
          >
            {currentAvatarUrl ? (
              <img src={currentAvatarUrl} alt={nickname} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gray-500">{displayInitial}</span>
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
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

          <p className="text-xs text-gray-400">사진을 탭하면 변경할 수 있어요</p>

          <div className="flex gap-3">
            {kakaoAvatarUrl && !isUsingKakaoAvatar && (
              <button
                onClick={() => updateAvatarMutation.mutate(kakaoAvatarUrl)}
                disabled={isAvatarPending}
                className="text-sm text-blue-500 font-medium disabled:opacity-50"
              >
                카카오 프로필로 변경
              </button>
            )}
            {currentAvatarUrl && (
              <>
                {kakaoAvatarUrl && !isUsingKakaoAvatar && (
                  <span className="text-gray-200">|</span>
                )}
                <button
                  onClick={() => updateAvatarMutation.mutate(null)}
                  disabled={isAvatarPending}
                  className="text-sm text-gray-400 font-medium disabled:opacity-50"
                >
                  기본 프로필로 변경
                </button>
              </>
            )}
          </div>

          {avatarError && <p className="text-xs text-red-500">{avatarError}</p>}
        </div>

        {/* 닉네임 */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">닉네임</h2>
          {editingNickname ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={nicknameValue}
                onChange={e => setNicknameValue(e.target.value)}
                maxLength={20}
                autoFocus
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-500"
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
                className="shrink-0 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setEditingNickname(false)
                  setNicknameValue(nickname)
                }}
                className="shrink-0 border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium"
              >
                취소
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{nickname}</span>
              <button
                onClick={() => setEditingNickname(true)}
                className="text-sm text-blue-500 font-medium"
              >
                변경
              </button>
            </div>
          )}
          {updateNicknameMutation.isError && (
            <p className="text-xs text-red-500">닉네임 변경에 실패했어요.</p>
          )}
        </div>

        {/* 계정 */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <button
            onClick={() => setConfirmLogout(true)}
            className="w-full flex items-center justify-between px-5 py-4 text-sm text-gray-700 active:bg-gray-50"
          >
            <span>로그아웃</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="border-t border-gray-100" />
          <Link
            href="/profile/withdraw"
            className="flex items-center justify-between px-5 py-4 text-sm text-red-400 active:bg-gray-50"
          >
            <span>탈퇴하기</span>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* 로그아웃 확인 모달 */}
      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmLogout(false)} />
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-6 pb-10 space-y-4">
            <p className="text-center text-base font-semibold text-gray-900">로그아웃 하시겠어요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl text-sm font-semibold"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
