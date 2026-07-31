'use client'

import type { ReactNode } from 'react'
import { AppLink } from '@/lib/nav/nav'
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
  banner,
}: HomeViewData & { banner?: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/icons/character.png" alt="" width={32} height={24} className="h-6 w-auto" />
          <h1 className="truncate text-[17px] font-extrabold tracking-tight text-ink">
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

        {/* ③ 서랍(주제) 칩 (탐색) */}
        <FolderChips initialFolders={folders} />
      </div>

      {/* 하단 고정 CTA — 웹은 bottom:0. 토스는 --app-nav-h(하단 탭바 높이)만큼 띄워 탭바 위에 뜬다. */}
      <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 bg-cream px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
        <AppLink href="/box/new" className="block">
          <button className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80">
            새로운 상자 만들기
          </button>
        </AppLink>
      </div>
    </main>
  )
}
