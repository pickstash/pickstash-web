'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNav } from '@/lib/nav/nav'
import { isFollowing, followUser, unfollowUser } from '@/lib/api/social'

// 팔로우/언팔로우 토글 — 낙관적. 초기 상태는 isFollowing 조회.
export function FollowButton({ userId, className }: { userId: string; className?: string }) {
  const qc = useQueryClient()
  const nav = useNav()
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
      // 팔로우 상태 + 양쪽 카운트(상대 팔로워·내 팔로잉) 즉시 반영. 로컬 낙관값만으론
      // 화면 이동 시 잃고 카운트도 안 바뀐다 → 관련 쿼리 무효화 + RSC/토스 refresh.
      qc.invalidateQueries({ queryKey: ['following', userId] })
      qc.invalidateQueries({ queryKey: ['profile-feed'] })   // 상대 공개 프로필(팔로워 수)
      qc.invalidateQueries({ queryKey: ['my-profile'] })      // 내 프로필(팔로잉 수)
      qc.invalidateQueries({ queryKey: ['public-search'] })   // 사람 검색 결과의 팔로워 수
      nav.refresh()
    } catch {
      setFollowing(!next) // 롤백
    } finally {
      setPending(false)
    }
  }

  // className은 레이아웃/모양만(호출부). 팔로/팔로잉 상태색은 여기서 항상 얹는다
  // — 안 그러면 호출부가 색까지 고정해 두 상태가 똑같아 보인다(프로필 팔로우 버튼 버그).
  const layout = className ?? 'shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold'
  const stateColor = on ? 'border border-line bg-paper text-ink-soft' : 'bg-ink text-cream'

  return (
    <button
      // 링크(AppLink) 안에 놓여도 팔로우만 토글되고 상세로 안 넘어가게 — 클릭 전파·기본이동 차단.
      onClick={e => { e.preventDefault(); e.stopPropagation(); toggle() }}
      disabled={pending}
      className={`${layout} active:opacity-80 disabled:opacity-50 ${stateColor}`}
    >
      {on ? '팔로잉' : '팔로우'}
    </button>
  )
}
