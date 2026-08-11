'use client'

import type { ReactNode } from 'react'
import { CreateFab } from '@/components/create-fab'
import { AppDrawer } from '@/components/app-drawer'
import { DecisionHero } from '@/components/decision-hero'
import { DrawerRail } from '@/components/drawer-rail'
import { HomeEmpty } from '@/components/home-empty'
import type { HomeViewData } from '@/lib/api/home'
import type { BoxCard } from '@/lib/domain/home'

// 홈 화면 프리젠테이션 — 웹·토스 공유. 데이터는 loadHomeView가 계산해 props로 넘긴다.
// 구성(홈·대시): 마감 임박 히어로(있을 때만) → 인라인 배너(있을 때만) → 서랍 레일("전체" 칩 고정 +
// 서랍별 칩, 선택한 목록이 바로 아래) → 새 상자 FAB.
// banner: 웹 전용 슬롯. midBanner: 히어로 아래 인라인 광고(토스 전용). bottomBanner: 현재 미사용.
export function HomeView({
  nickname,
  hero,
  railCards,
  doneRecap,
  openCount,
  doneCount,
  banner,
  midBanner,
  bottomBanner,
}: HomeViewData & { banner?: ReactNode; midBanner?: ReactNode; bottomBanner?: ReactNode }) {
  // 히어로는 '마감 임박(마감투표 + D-3 이내)'일 때만 크게. 아니면 스트림에 그냥 섞인다.
  const heroUrgent =
    !!hero && hero.isAuto && !!hero.deadlineAt &&
    (new Date(hero.deadlineAt).getTime() - Date.now()) / 86_400_000 <= 3

  const openCards = heroUrgent ? railCards : hero ? [hero, ...railCards] : []
  const isEmpty = !hero && doneRecap.length === 0

  // "전체" 서랍 레일 목록 — 열림 5개 우선, 남은 자리는 최근 정리됨으로 채움(기존 스트림과 동일 캡).
  const shownOpen: BoxCard[] = openCards.slice(0, 5).map(c => ({ ...c, status: 'open' as const }))
  const shownDone: BoxCard[] = doneRecap.slice(0, 5 - shownOpen.length).map(c => ({ ...c, status: 'done' as const }))
  const allCards: BoxCard[] = [...shownOpen, ...shownDone]

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

      <div className="flex-1 space-y-6 px-5 pb-28 pt-1.5">
        {isEmpty ? (
          <HomeEmpty doneCount={0} recap={[]} />
        ) : (
          // space-y-6는 이 그룹 밖(bottomBanner와의 간격)에만 적용 — 안쪽(히어로/배너/레일)은
          // 각 요소가 실제로 첫 번째인지에 따라 margin을 직접 계산해 위아래 간격이 요소 유무와
          // 무관하게 항상 의도한 값이 되게 한다(space-y 자동 마진에 기대면 "히어로 없을 때 배너가
          // 헤더에서 너무 멀다"처럼 조합별로 어긋난다).
          <div className="flex flex-col">
            {/* ① 마감 임박 히어로 (있을 때만) — DecisionHero는 자체 px-5라 음수 마진으로 상쇄 */}
            {heroUrgent && hero && (
              <div className="-mx-5">
                <DecisionHero box={hero} />
              </div>
            )}

            {/* 히어로 아래 인라인 배너(있을 때만, 토스 홈 전용) — 히어로 있으면 좁게(mt-3), 없으면(첫 요소) 마진 없음 */}
            {midBanner && <div className={heroUrgent && hero ? 'mt-3' : ''}>{midBanner}</div>}

            {/* ② 서랍 레일 — "전체"+서랍별 칩, 선택한 서랍의 상자가 바로 아래. 자체 px-5라 음수 마진으로 상쇄 */}
            <div className={`-mx-5 ${midBanner ? 'mt-4' : heroUrgent && hero ? 'mt-6' : ''}`}>
              <DrawerRail allCards={allCards} allCount={openCount + doneCount} />
            </div>
          </div>
        )}

        {bottomBanner && <div className="pt-2">{bottomBanner}</div>}
      </div>

      {!isEmpty && <CreateFab href="/box/new" label="새 상자" />}
    </main>
  )
}
