'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isFollowing, followUser, unfollowUser } from '@/lib/api/social'

// 팔로우/언팔로우 토글 — 낙관적. 초기 상태는 isFollowing 조회.
export function FollowButton({ userId, className }: { userId: string; className?: string }) {
  const { data: initial } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => isFollowing(userId),
  })
  const [following, setFollowing] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)
  const on = following ?? initial ?? false

  async function toggle() {
    if (pending) return
    setPending(true)
    const next = !on
    setFollowing(next)
    try {
      if (next) await followUser(userId)
      else await unfollowUser(userId)
    } catch {
      setFollowing(!next) // 롤백
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={
        className ??
        `shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold active:opacity-80 disabled:opacity-50 ${
          on ? 'border border-line bg-paper text-ink-soft' : 'bg-ink text-cream'
        }`
      }
    >
      {on ? '팔로잉' : '팔로우'}
    </button>
  )
}
