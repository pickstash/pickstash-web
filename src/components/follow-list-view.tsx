'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLink, useNav } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { FollowButton } from '@/components/follow-button'
import { getFollowList, type PersonResult } from '@/lib/api/social'

// 팔로워/팔로잉 사람 목록 — 웹·토스 공유. 프로필 카운트 탭 → /follows/:userId/:tab 진입.
// currentUserId: 내 행에는 팔로우 버튼을 숨긴다(자기 자신 팔로우 불가).
export function FollowListView({
  userId,
  initialTab,
  currentUserId,
}: {
  userId: string
  initialTab: 'followers' | 'following'
  currentUserId?: string
}) {
  const nav = useNav()
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab)
  const { data: people = [], isPending } = useQuery({
    queryKey: ['follow-list', userId, tab],
    queryFn: () => getFollowList(userId, tab),
  })

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-cream">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-cream/95 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-sm">
        <button onClick={() => nav.back()} aria-label="뒤로" className="p-1 text-ink"><Icon name="back" size={22} /></button>
      </header>

      <div className="sticky top-[calc(env(safe-area-inset-top)+3rem)] z-10 flex border-b border-line bg-cream/95 px-5 backdrop-blur-sm">
        {(['followers', 'following'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 pb-2.5 pt-1 text-[13px] font-bold ${tab === t ? 'border-b-2 border-ink text-ink' : 'text-ink-faint'}`}
          >
            {t === 'followers' ? '팔로워' : '팔로잉'}
          </button>
        ))}
      </div>

      <div className="space-y-2 px-5 pb-28 pt-4">
        {isPending ? (
          <p className="py-12 text-center text-[13px] text-ink-soft">불러오는 중…</p>
        ) : people.length === 0 ? (
          <p className="py-12 text-center text-[13px] text-ink-faint">
            {tab === 'followers' ? '아직 팔로워가 없어요.' : '아직 팔로잉이 없어요.'}
          </p>
        ) : (
          people.map(p => <FollowRow key={p.id} person={p} showFollow={p.id !== currentUserId} />)
        )}
      </div>
    </main>
  )
}

function FollowRow({ person, showFollow }: { person: PersonResult; showFollow: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-[#ECEADC] bg-paper p-3">
      <AppLink
        href={person.handle ? `/u/${person.handle}` : '#'}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-butter-tint text-[15px] font-extrabold text-ink">
          {person.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            person.nickname?.[0] ?? '?'
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold text-ink">{person.nickname}</p>
          {person.handle && <p className="truncate text-[11.5px] text-ink-faint">@{person.handle}</p>}
        </div>
      </AppLink>
      {showFollow && <FollowButton userId={person.id} />}
    </div>
  )
}
