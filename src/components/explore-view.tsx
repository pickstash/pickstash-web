'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { AppLink } from '@/lib/nav/nav'
import { Icon, type IconName } from '@/components/icon'
import { getPublicFeed, searchPublic, type PublicBoxCard, type PersonResult } from '@/lib/api/social'
import { FollowButton } from '@/components/follow-button'

// 돋보기(탐색) — 공개 상자 검색 + 사람 검색 + 최근 공개 피드. 공유(웹·토스).
// midBanner: 검색바와 피드 사이 인라인 광고(토스 전용 슬롯).
export function ExploreView({ midBanner }: { midBanner?: ReactNode } = {}) {
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
        {midBanner && <div>{midBanner}</div>}
        {!query && boxes.length > 0 && <p className="px-0.5 text-[12px] font-bold text-ink-soft">최근 공개된 결정</p>}

        {query && tab === 'people' ? (
          people.length === 0 ? (
            <Empty icon="user" title="찾는 사람이 없어요" subtitle="@아이디나 닉네임으로 검색해보세요" />
          ) : (
            people.map(p => <PersonRow key={p.id} person={p} />)
          )
        ) : boxes.length === 0 ? (
          query ? (
            <Empty icon="search" title="검색 결과가 없어요" subtitle="다른 키워드로 찾아보세요" />
          ) : (
            <Empty icon="box" title="아직 공개된 게 없어요" subtitle="상자를 공개하면 여기에서 다른 사람들과 나눌 수 있어요" />
          )
        ) : (
          boxes.map(b => <PublicBoxRow key={b.id} box={b} />)
        )}
      </div>
    </main>
  )
}

function Empty({ icon, title, subtitle }: { icon: IconName; title: string; subtitle?: string }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-3 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 pt-11 pb-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-butter-tint text-ink">
        <Icon name={icon} size={26} strokeWidth={1.9} />
      </span>
      <div>
        <p className="text-[15px] font-extrabold tracking-tight text-ink">{title}</p>
        {subtitle && <p className="mx-auto mt-1.5 max-w-[15rem] text-[12.5px] leading-relaxed text-ink-soft">{subtitle}</p>}
      </div>
    </div>
  )
}

// 홈의 BoxSummaryCard(box-summary-card.tsx)와 시각 언어 통일 — 모드 칩 없음, 제목 크게,
// 결정 문구는 형광펜+얇은 접미사, 리더 없으면 "선택지 N개". PublicBoxCard는 participants/leaders/
// deadline이 없는 대신 author·save_count가 있어 하단 줄만 그 데이터로 채운다.
function PublicBoxRow({ box }: { box: PublicBoxCard }) {
  const done = !!box.closed_at
  return (
    <AppLink href={`/p/${box.id}`} className="block">
      <div className={`rounded-card border border-[#ECEADC] p-4 active:bg-butter-tint/40 ${done ? 'bg-paper/70' : 'bg-paper shadow-[0_2px_10px_rgba(42,42,39,0.05)]'}`}>
        <h3 className={`truncate text-[17px] font-extrabold leading-snug tracking-tight ${done ? 'text-ink-soft' : 'text-ink'}`}>{box.title}</h3>

        {box.mode === 'checklist' ? (
          <p className="mt-2 text-[12.5px] font-bold text-ink-soft">항목 {box.total}개</p>
        ) : box.winner ? (
          <p className="mt-1.5 text-[13.5px] text-ink">
            <span className="font-extrabold [box-shadow:inset_0_-8px_0_#FFD84A]">{box.winner}</span>
            <span className="font-normal">(으)로 결정!</span>
          </p>
        ) : (
          <p className="mt-2 text-[12.5px] font-bold text-ink-soft">선택지 {box.total}개</p>
        )}

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
        {person.tags.length > 0 && (
          <p className="mt-0.5 truncate text-[11px] font-bold text-ink-soft">{person.tags.map(t => `#${t}`).join(' ')}</p>
        )}
      </div>
      <FollowButton userId={person.id} />
    </AppLink>
  )
}
