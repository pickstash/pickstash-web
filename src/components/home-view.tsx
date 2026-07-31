'use client'

import type { ReactNode } from 'react'
import { AppLink, useNav } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { AppDrawer } from '@/components/app-drawer'
import { DecisionHero } from '@/components/decision-hero'
import { DecisionRail } from '@/components/decision-rail'
import { FolderChips } from '@/components/folder-chips'
import type { HomeViewData } from '@/lib/api/home'

// 홈 화면 프리젠테이션 — 웹·토스 공유. 데이터는 loadHomeView가 계산해 props로 넘긴다.
// banner: 웹 전용 푸시 배너 슬롯(토스는 생략). 캐릭터 로고는 next/image 대신 <img>로 프레임워크 비의존.
export function HomeView({
  nickname,
  hero,
  railCards,
  folders,
  openCount,
  doneCount,
  favoriteCount,
  banner,
}: HomeViewData & { banner?: ReactNode }) {
  const nav = useNav()
  const warehouses = [
    { href: '/messy', icon: 'box', name: '어질러진', count: openCount },
    { href: '/done', icon: 'check', name: '정리된', count: doneCount },
    { href: '/favorites', icon: 'star', name: '즐겨찾는', count: favoriteCount },
  ] as const

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/icons/character.png" alt="" width={32} height={24} className="h-6 w-auto" />
          <h1 className="truncate text-xl font-extrabold tracking-tight text-ink">
            {nickname}님의 결정창고
          </h1>
        </div>
        <AppDrawer nickname={nickname} />
      </header>

      {banner}

      <div className="flex-1 pb-28">
        {/* ① 마감 히어로 (가장 급한 상자) */}
        <DecisionHero box={hero} />

        {/* ② 이어서 정할 상자 (가로 레일) */}
        <DecisionRail boxes={railCards} totalOpen={openCount} />

        {/* ③ 창고 요약 한 줄 (탐색) */}
        <section className="px-5 pt-5">
          <div className="flex items-stretch gap-2 rounded-[18px] border border-[#ECEADC] bg-paper p-1.5 shadow-[0_2px_10px_rgba(42,42,39,0.05)]">
            {warehouses.map((w, i) => (
              <AppLink
                key={w.href}
                href={w.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-[13px] py-2.5 active:bg-butter-tint/40 ${
                  i > 0 ? 'border-l border-[#F0EEE0]' : ''
                }`}
              >
                <span className="flex items-center gap-1 text-[10.5px] font-semibold text-ink-faint">
                  <Icon name={w.icon} size={12} />
                  {w.name}
                </span>
                <span className="text-[18px] font-extrabold tabular-nums text-ink">{w.count}</span>
              </AppLink>
            ))}
          </div>
        </section>

        {/* ④ 폴더(주제) 칩 (탐색) */}
        <FolderChips initialFolders={folders} />
      </div>

      {/* 하단 고정 CTA — 토스는 하단 탭바의 '새 상자' 버튼이 대신하므로 숨김(탭바와 겹침 방지) */}
      {nav.platform !== 'toss' && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-cream px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
          <AppLink href="/box/new" className="block">
            <button className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80">
              새로운 상자 만들기
            </button>
          </AppLink>
        </div>
      )}
    </main>
  )
}
