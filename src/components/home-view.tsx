'use client'

import type { ReactNode } from 'react'
import { CreateFab } from '@/components/create-fab'
import { AppDrawer } from '@/components/app-drawer'
import { DecisionHero } from '@/components/decision-hero'
import { DecisionRail } from '@/components/decision-rail'
import { FolderChips } from '@/components/folder-chips'
import type { HomeViewData } from '@/lib/api/home'

// 홈 화면 프리젠테이션 — 웹·토스 공유. 데이터는 loadHomeView가 계산해 props로 넘긴다.
// banner: 웹 전용 푸시 배너 슬롯(토스는 생략). bottomBanner: 토스 전용 인앱 광고 슬롯(웹은 생략).
// 캐릭터 로고는 next/image 대신 <img>로 프레임워크 비의존.
export function HomeView({
  nickname,
  hero,
  railCards,
  folders,
  openCount,
  banner,
  bottomBanner,
}: HomeViewData & { banner?: ReactNode; bottomBanner?: ReactNode }) {
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

      <div className="flex-1 pb-28 pt-2.5">
        {/* ① 마감 히어로 (가장 급한 상자) */}
        <DecisionHero box={hero} />

        {/* ② 이어서 정할 상자 (가로 레일) */}
        <DecisionRail boxes={railCards} totalOpen={openCount} />

        {/* ③ 서랍(주제) 칩 (탐색) */}
        <FolderChips initialFolders={folders} />

        {/* ④ 배너 광고(토스 전용) — 콘텐츠 맨 아래, 하단 고정 CTA·탭바와 안 겹치게 스크롤 영역 안에 둔다 */}
        {bottomBanner && <div className="px-5 pt-2">{bottomBanner}</div>}
      </div>

      {/* 새 상자 FAB — 하단 full-width 바를 없애 배너·탭바와 3층 겹침 해소. 상자·서랍 탭과 톤 통일. */}
      <CreateFab href="/box/new" label="새 상자" />
    </main>
  )
}
