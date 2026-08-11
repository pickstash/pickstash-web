'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { getPublicFeed, searchPublic, type PublicBoxCard, type PersonResult } from '@/lib/api/social'
import { FollowButton } from '@/components/follow-button'

// 돋보기(탐색) — 공개 상자 검색 + 사람 검색 + 인기/최근 공개 피드. 공유(웹·토스).
export function ExploreView() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'box' | 'people'>('box')
  const query = q.trim()

  const feed = useQuery({
    queryKey: ['public-feed'],
    queryFn: () => getPublicFeed(createClient()),
    enabled: query.length === 0,
  })
  const results = useQuery({
    queryKey: ['public-search', query],
    queryFn: () => searchPublic(createClient(), query),
    enabled: query.length > 0,
  })

  const boxes: PublicBoxCard[] = query ? results.data?.boxes ?? [] : feed.data ?? []
  const people: PersonResult[] = query ? results.data?.people ?? [] : []

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 space-y-3 bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">둘러보기</h1>
        <div className="flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-2.5">
          <Icon name="search" size={16} className="text-ink-faint" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="공개된 결정·사람 검색"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-ink-faint focus:outline-none"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="지우기" className="text-ink-faint">
              <Icon name="close" size={15} />
            </button>
          )}
        </div>
        {query && (
          <div className="flex gap-1.5 rounded-full bg-[#EDEBDD] p-1">
            {(['box', 'people'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 rounded-full py-1.5 text-[13px] font-bold ${tab === t ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft'}`}
              >
                {t === 'box' ? '공개 상자' : '사람'}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="flex-1 space-y-2.5 px-5 pb-28 pt-2">
        {!query && <p className="px-0.5 text-[12px] font-bold text-ink-soft">인기 있는 결정</p>}

        {query && tab === 'people' ? (
          people.length === 0 ? (
            <Empty text="사람을 찾지 못했어요" />
          ) : (
            people.map(p => <PersonRow key={p.id} person={p} />)
          )
        ) : boxes.length === 0 ? (
          <Empty text={query ? '결과가 없어요' : '아직 공개된 결정이 없어요'} />
        ) : (
          boxes.map(b => <PublicBoxRow key={b.id} box={b} />)
        )}
      </div>
    </main>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-12 text-center">
      <p className="text-[13px] font-bold text-ink-soft">{text}</p>
    </div>
  )
}

function PublicBoxRow({ box }: { box: PublicBoxCard }) {
  return (
    <AppLink href={`/p/${box.id}`} className="block">
      <div className="rounded-card border border-[#ECEADC] bg-paper p-4 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
        <div className="flex items-center gap-1.5">
          <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${box.mode === 'checklist' ? 'bg-leaf-tint text-[#37714A]' : 'bg-butter-tint text-ink'}`}>
            {box.mode === 'checklist' ? '체크' : '결정'}
          </span>
          <h3 className="truncate text-[15px] font-extrabold text-ink">{box.title}</h3>
        </div>
        {box.mode === 'checklist' ? (
          <p className="mt-1.5 text-[12.5px] font-bold text-ink-soft">체크 {box.checked}/{box.total}</p>
        ) : box.winner ? (
          <p className="mt-1.5 text-[13px] font-extrabold text-ink">
            <span className="[box-shadow:inset_0_-8px_0_#FFD84A]">{box.winner}</span>(으)로 결정!
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-faint">
          <span>by {box.author?.handle ? `@${box.author.handle}` : box.author?.nickname ?? '누군가'}</span>
          {box.save_count > 0 && (
            <span className="flex items-center gap-1"><Icon name="bookmark" size={12} />{box.save_count}</span>
          )}
        </div>
      </div>
    </AppLink>
  )
}

function PersonRow({ person }: { person: PersonResult }) {
  return (
    <AppLink
      href={person.handle ? `/u/${person.handle}` : '#'}
      className="flex items-center gap-3 rounded-card border border-[#ECEADC] bg-paper p-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-butter-tint text-[15px] font-extrabold text-ink">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          person.nickname?.[0] ?? '?'
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-extrabold text-ink">{person.nickname}</p>
        <p className="truncate text-[11.5px] text-ink-faint">
          {person.handle ? `@${person.handle} · ` : ''}공개 {person.public_count} · 팔로워 {person.followers}
        </p>
      </div>
      <FollowButton userId={person.id} />
    </AppLink>
  )
}
