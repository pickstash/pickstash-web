'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { getMyProfile, getMyBookmarks, type PublicBoxCard } from '@/lib/api/social'

// 내 프로필(인스타식) — 헤더 + [공개 | 저장함] 탭 + 상자 그리드. 설정은 톱니 → /profile/settings.
export function MyProfileView() {
  const [tab, setTab] = useState<'public' | 'saved'>('public')
  const { data: profile, isPending } = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile })
  const { data: saved = [] } = useQuery({ queryKey: ['my-bookmarks'], queryFn: getMyBookmarks, enabled: tab === 'saved' })

  if (isPending) return <p className="p-8 text-center text-[13px] text-ink-soft">불러오는 중…</p>
  if (!profile) return <p className="p-8 text-center text-[13px] text-ink-soft">프로필을 불러오지 못했어요.</p>

  const grid = tab === 'public' ? profile.boxes : saved

  return (
    <main className="mx-auto min-h-dvh max-w-[430px] bg-cream pb-28">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-1">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">프로필</h1>
        <AppLink href="/profile/settings" aria-label="설정" className="p-1 text-ink-soft active:text-ink">
          <Icon name="edit" size={20} />
        </AppLink>
      </header>

      <div className="px-5 pt-3">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-butter-tint text-[24px] font-extrabold text-ink">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              profile.nickname?.[0] ?? '?'
            )}
          </div>
          <div className="flex flex-1 justify-around text-center">
            {[['공개', profile.public_count], ['팔로워', profile.followers], ['팔로잉', profile.following]].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-[16px] font-extrabold text-ink">{v}</p>
                <p className="text-[11px] text-ink-faint">{k}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[14px] font-extrabold text-ink">{profile.nickname}</p>
          {profile.handle ? (
            <p className="text-[12px] text-ink-faint">@{profile.handle}</p>
          ) : (
            <AppLink href="/profile/settings" className="text-[12px] font-bold text-tangerine">아이디를 설정하면 프로필을 공유할 수 있어요 →</AppLink>
          )}
          {profile.bio && <p className="mt-1 text-[12.5px] text-ink-soft">{profile.bio}</p>}
        </div>
      </div>

      {/* 탭 */}
      <div className="mt-4 flex border-b border-line px-5">
        {(['public', 'saved'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 pb-2.5 text-[13px] font-bold ${tab === t ? 'border-b-2 border-ink text-ink' : 'text-ink-faint'}`}
          >
            {t === 'public' ? '공개' : '저장함'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 pt-4">
        {grid.length === 0 ? (
          <p className="col-span-2 py-12 text-center text-[13px] text-ink-faint">
            {tab === 'public' ? '아직 공개한 상자가 없어요.' : '저장한 상자가 없어요.'}
          </p>
        ) : (
          grid.map((b: PublicBoxCard) => (
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
