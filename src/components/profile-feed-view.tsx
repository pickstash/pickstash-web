'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { AppLink } from '@/lib/nav/nav'
import { getProfileFeed } from '@/lib/api/social'
import { FollowButton } from '@/components/follow-button'
import type { PublicBoxCard } from '@/lib/api/social'

// 인스타식 공개 프로필 — 헤더(핸들·소개·카운트·팔로우) + 공개 상자 그리드. handle로 조회.
export function ProfileFeedView({ handle }: { handle: string }) {
  const { data, isPending } = useQuery({
    queryKey: ['profile-feed', handle],
    queryFn: () => getProfileFeed(createClient(), handle),
  })

  if (isPending) return <p className="p-8 text-center text-[13px] text-ink-soft">불러오는 중…</p>
  if (!data) return <p className="p-8 text-center text-[13px] text-ink-soft">없는 프로필이에요.</p>

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-cream">
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
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
            {[['공개', data.public_count], ['팔로워', data.followers], ['팔로잉', data.following]].map(([k, val]) => (
              <div key={k as string}>
                <p className="text-[16px] font-extrabold text-ink">{val}</p>
                <p className="text-[11px] text-ink-faint">{k}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[14px] font-extrabold text-ink">{data.nickname}</p>
          {data.handle && <p className="text-[12px] text-ink-faint">@{data.handle}</p>}
          {data.bio && <p className="mt-1 text-[12.5px] text-ink-soft">{data.bio}</p>}
        </div>

        <div className="mt-3">
          <FollowButton userId={data.id} className="w-full rounded-field bg-ink py-2.5 text-center text-[13px] font-bold text-cream active:opacity-80" />
        </div>
      </div>

      {/* 공개 상자 그리드 (인스타식) */}
      <div className="mt-5 grid grid-cols-2 gap-2 px-5 pb-28">
        {data.boxes.length === 0 ? (
          <p className="col-span-2 py-12 text-center text-[13px] text-ink-faint">아직 공개한 상자가 없어요.</p>
        ) : (
          data.boxes.map((b: PublicBoxCard) => (
            <AppLink key={b.id} href={`/p/${b.id}`} className="block">
              <div className="flex h-[96px] flex-col justify-between rounded-[14px] border border-[#ECEADC] bg-paper p-3 active:bg-butter-tint/40">
                <span className={`w-fit rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${b.mode === 'checklist' ? 'bg-leaf-tint text-[#37714A]' : 'bg-butter-tint text-ink'}`}>
                  {b.mode === 'checklist' ? '체크' : '결정'}
                </span>
                <div>
                  <h4 className="line-clamp-2 text-[12.5px] font-extrabold leading-snug text-ink">{b.title}</h4>
                  {b.mode === 'decide' && b.winner && <p className="mt-0.5 truncate text-[11px] font-bold text-ink-soft">→ {b.winner}</p>}
                </div>
              </div>
            </AppLink>
          ))
        )}
      </div>
    </main>
  )
}
