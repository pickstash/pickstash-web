'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinBoxByInviteCode } from '@/lib/api/invites'

interface JoinClientProps {
  code: string
  isLoggedIn: boolean
}

export function JoinClient({ code, isLoggedIn }: JoinClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    if (!isLoggedIn) {
      router.push(`/login?next=/invite/${code}`)
      return
    }
    setLoading(true)
    try {
      const boxId = await joinBoxByInviteCode(code)
      router.push(`/box/${boxId}`)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold disabled:opacity-50"
    >
      {loading ? '참여 중...' : isLoggedIn ? '상자 참여하기' : '로그인하고 참여하기'}
    </button>
  )
}
