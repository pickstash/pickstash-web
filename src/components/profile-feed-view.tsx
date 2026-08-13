'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { AppLink, useNav } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { ProfileBoxCard } from '@/components/profile-box-card'
import { BioText } from '@/components/bio-text'
import { getProfileFeed } from '@/lib/api/social'
import { FollowButton } from '@/components/follow-button'
import type { PublicBoxCard } from '@/lib/api/social'

// 인스타식 공개 프로필 — 헤더(핸들·소개·카운트·팔로우) + 공개 상자 그리드. handle로 조회.
export function ProfileFeedView({ handle }: { handle: string }) {
  const nav = useNav()
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({
    queryKey: ['profile-feed', handle],
    queryFn: () => getProfileFeed(createClient(), handle),
  })

  if (isPending) return <p className="p-8 text-center text-[13px] text-ink-soft">불러오는 중…</p>
  if (!data) return <p className="p-8 text-center text-[13px] text-ink-soft">없는 프로필이에요.</p>

  return (
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ['profile-feed', handle] })}>
    <main className="mx-auto min-h-dvh max-w-[430px] bg-cream">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-cream/95 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-sm">
        <button onClick={() => nav.back()} aria-label="뒤로" className="p-1 text-ink"><Icon name="back" size={22} /></button>
        {data.handle && <span className="truncate text-[15px] font-extrabold text-ink">@{data.handle}</span>}
      </header>

      <div className="px-5 pt-2">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-butter-tint text-[24px] font-extrabold text-ink">
            {data.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              data.nickname?.[0] ?? '?'
            )}
          </div>
          <div className="flex flex-1 justify-around text-center">
            {([['공개', data.public_count, null], ['팔로워', data.followers, 'followers'], ['팔로잉', data.following, 'following']] as const).map(([k, val, tab]) => {
              const inner = (<><p className="text-[16px] font-extrabold text-ink">{val}</p><p className="text-[11px] text-ink-faint">{k}</p></>)
              return tab ? (
                <AppLink key={k} href={`/follows/${data.id}/${tab}`} className="active:opacity-60">{inner}</AppLink>
              ) : (
                <div key={k}>{inner}</div>
              )
            })}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[14px] font-extrabold text-ink">{data.nickname}</p>
          {data.handle && <p className="text-[12px] text-ink-faint">@{data.handle}</p>}
          {data.bio && <BioText text={data.bio} className="mt-1 text-[12.5px] text-ink-soft" />}
        </div>

        <div className="mt-3">
          <FollowButton userId={data.id} className="block w-full rounded-field py-2.5 text-center text-[13px] font-bold" />
        </div>
      </div>

      {/* 공개 상자 그리드 (인스타식) */}
      <div className="mt-5 grid grid-cols-2 gap-2 px-5 pb-28">
        {data.boxes.length === 0 ? (
          <p className="col-span-2 py-12 text-center text-[13px] text-ink-faint">아직 공개한 상자가 없어요.</p>
        ) : (
          data.boxes.map((b: PublicBoxCard) => <ProfileBoxCard key={b.id} box={b} />)
        )}
      </div>
    </main>
    </PullToRefresh>
  )
}
