'use client'

import { useState } from 'react'
import { useNav } from '@/lib/nav/nav'
import { joinFolderByInviteCode } from '@/lib/api/folder-invites'

interface JoinFolderClientProps {
  code: string
  isLoggedIn: boolean
}

export function JoinFolderClient({ code, isLoggedIn }: JoinFolderClientProps) {
  const nav = useNav()
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    if (!isLoggedIn) {
      nav.push(`/login?next=/folder-invite/${code}`)
      return
    }
    setLoading(true)
    try {
      // 폴더 안 모든 상자에 참여 + 폴더를 내 계정으로 복사. 반환된 내 폴더로 이동.
      const folderId = await joinFolderByInviteCode(code)
      // replace: 참여 후 /folder-invite로 back하면 (이제 복사본 보유라) 다시 /folder로 리다이렉트돼 루프 → 교체
      nav.replace(`/folder/${folderId}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
    >
      {loading ? '참여 중...' : isLoggedIn ? '서랍 참여하기' : '카카오로 참여하기'}
    </button>
  )
}
