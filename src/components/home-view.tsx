'use client'

import type { ReactNode } from 'react'
import { CreateFab } from '@/components/create-fab'
import { AppDrawer } from '@/components/app-drawer'
import { DrawerRail } from '@/components/drawer-rail'
import { HomeEmpty } from '@/components/home-empty'
import type { HomeViewData } from '@/lib/api/home'

// 홈 화면 프리젠테이션 — 웹·토스 공유. 데이터는 loadHomeView가 계산해 props로 넘긴다.
// 구성: (인라인 배너, 있을 때만) → 서랍 레일("브리핑" 칩 고정 + 서랍별 칩, 선택한 목록이 바로 아래).
// 브리핑 = 마감임박/즐겨찾기소식/최근결정 큐레이션. 전체 상자 브라우징은 상자 탭이 전담.
// banner: 웹 전용 슬롯(푸시). midBanner: 레일 위 인라인 광고(토스 전용).
export function HomeView({
  nickname,
  brief,
  openCount,
  doneCount,
  banner,
  midBanner,
}: HomeViewData & { banner?: ReactNode; midBanner?: ReactNode }) {
  // 완전 신규(상자 0) → 온보딩 빈 상태(추천 템플릿). 정리완료만 있어도 브리핑(최근 결정)을 보여준다.
  const isNewUser = openCount === 0 && doneCount === 0

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/icons/character.png" alt="" width={32} height={24} className="h-6 w-auto" />
          <h1 className="truncate text-[17px] font-extrabold tracking-tight text-ink">{nickname}님의 결정창고</h1>
        </div>
        <AppDrawer nickname={nickname} />
      </header>

      {banner}

      <div className="flex-1 px-5 pb-28 pt-1.5">
        {isNewUser ? (
          <HomeEmpty />
        ) : (
          <div className="flex flex-col">
            {/* 인라인 배너(있을 때만, 토스 홈 전용) — 레일 위 */}
            {midBanner && <div>{midBanner}</div>}

            {/* 서랍 레일 — "브리핑"+서랍별 칩. 자체 px-5라 음수 마진으로 상쇄 */}
            <div className={`-mx-5 ${midBanner ? 'mt-4' : ''}`}>
              <DrawerRail brief={brief} />
            </div>
          </div>
        )}
      </div>

      {!isNewUser && <CreateFab href="/box/new" label="새 상자" />}
    </main>
  )
}
