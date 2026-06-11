'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinGroupByInviteCode } from '@/lib/api/groups'

interface JoinClientProps {
  code: string
  isLoggedIn: boolean
}

export function JoinClient({ code, isLoggedIn }: JoinClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    if (!isLoggedIn) {
      router.push(`/login?next=/group-invite/${code}`)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const groupId = await joinGroupByInviteCode(code)
      router.push(`/groups/${groupId}`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      setError(msg.includes('group_full') ? '그룹 멤버가 가득 찼어요. (최대 30명)' : '참여에 실패했어요.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold disabled:opacity-50"
      >
        {loading ? '참여 중...' : isLoggedIn ? '그룹 참여하기' : '로그인하고 참여하기'}
      </button>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  )
}
