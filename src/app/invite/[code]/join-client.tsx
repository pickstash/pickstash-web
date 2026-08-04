'use client'

import { useState } from 'react'
import { useNav } from '@/lib/nav/nav'
import { joinBoxByInviteCode } from '@/lib/api/invites'

interface JoinClientProps {
  code: string
  isLoggedIn: boolean
}

export function JoinClient({ code, isLoggedIn }: JoinClientProps) {
  const nav = useNav()
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    // 웹: 리다이렉트형 로그인 페이지로. 토스: nav.login으로 인라인 로그인 후 곧바로 참여.
    if (!isLoggedIn && !nav.login) {
      nav.push(`/login?next=/invite/${code}`)
      return
    }
    setLoading(true)
    try {
      if (!isLoggedIn) await nav.login!()
      const boxId = await joinBoxByInviteCode(code)
      // replace: 참여 후 /invite로 back하면 (이제 참여자라) 다시 /box로 리다이렉트돼 루프가 남 → 히스토리에서 교체
      nav.replace(`/box/${boxId}`)
    } catch {
      setLoading(false)
    }
  }

  const joinLabel = isLoggedIn ? '상자 참여하기' : nav.platform === 'toss' ? '토스로 참여하기' : '카카오로 참여하기'

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
    >
      {loading ? '참여 중...' : isLoggedIn ? '상자 참여하기' : '카카오로 참여하기'}
    </button>
  )
}
