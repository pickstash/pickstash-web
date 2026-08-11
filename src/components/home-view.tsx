'use client'

import type { ReactNode } from 'react'
import { AppLink } from '@/lib/nav/nav'
import { CreateFab } from '@/components/create-fab'
import { AppDrawer } from '@/components/app-drawer'
import { DecisionHero } from '@/components/decision-hero'
import { HomeStreamCard } from '@/components/home-stream-card'
import { HomeEmpty } from '@/components/home-empty'
import { FolderGroupCards } from '@/components/folder-group-cards'
import type { HomeViewData, RecapCard } from '@/lib/api/home'

// 홈 화면 프리젠테이션 — 웹·토스 공유. 데이터는 loadHomeView가 계산해 props로 넘긴다.
// 구성(홈·대시): 마감 임박 히어로(있을 때만) → 서랍 → 내 상자 단일 스트림(진행/정리 통합, 최근 활동순) → 새 상자 FAB.
// banner: 웹 전용 슬롯. bottomBanner: 토스 인앱 광고 슬롯.
export function HomeView({
  nickname,
  hero,
  railCards,
  doneRecap,
  banner,
  bottomBanner,
}: HomeViewData & { banner?: ReactNode; bottomBanner?: ReactNode }) {
  // 히어로는 '마감 임박(마감투표 + D-3 이내)'일 때만 크게. 아니면 스트림에 그냥 섞인다.
  const heroUrgent =
    !!hero && hero.isAuto && !!hero.deadlineAt &&
    (new Date(hero.deadlineAt).getTime() - Date.now()) / 86_400_000 <= 3

  const openCards = heroUrgent ? railCards : hero ? [hero, ...railCards] : []
  const isEmpty = !hero && doneRecap.length === 0

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

      <div className="flex-1 space-y-6 px-5 pb-28 pt-3">
        {isEmpty ? (
          <HomeEmpty doneCount={0} recap={[]} />
        ) : (
          <>
            {/* ① 마감 임박 히어로 (있을 때만) — DecisionHero는 자체 px-5라 음수 마진으로 상쇄 */}
            {heroUrgent && hero && (
              <div className="-mx-5">
                <DecisionHero box={hero} />
              </div>
            )}

            {/* ② 서랍 — 그룹 카드(멤버·상자수). 자체 px-5 포함이라 음수 마진으로 상쇄 */}
            <div className="-mx-5">
              <FolderGroupCards />
            </div>

            {/* ③ 내 상자 단일 스트림 — 진행/정리 통합(최근 활동순), 정리됨은 배지 */}
            <section className="space-y-2.5">
              <h2 className="text-[13px] font-extrabold text-ink">내 상자</h2>
              {openCards.map(b => (
                <HomeStreamCard key={b.id} box={b} />
              ))}
              {doneRecap.map(b => (
                <DoneCard key={b.id} box={b} />
              ))}
            </section>
          </>
        )}

        {bottomBanner && <div className="pt-2">{bottomBanner}</div>}
      </div>

      {!isEmpty && <CreateFab href="/box/new" label="새 상자" />}
    </main>
  )
}

// 정리됨(닫힌) 상자 카드 — 스트림에 섞임. 결정 결과가 있으면 노출, 없으면 '정리됨' 배지만.
function DoneCard({ box }: { box: RecapCard }) {
  return (
    <AppLink href={`/box/${box.id}`} className="block">
      <div className="rounded-card border border-[#ECEADC] bg-paper/70 p-4 active:bg-butter-tint/40">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-extrabold leading-snug tracking-tight text-ink-soft">{box.title}</h3>
          <span className="shrink-0 rounded-full bg-leaf-tint px-2.5 py-0.5 text-xs font-bold text-[#37714A]">정리됨</span>
        </div>
        {box.winnerName && (
          <p className="mt-1.5 text-[13px] font-extrabold text-ink">
            <span className="[box-shadow:inset_0_-8px_0_#FFD84A]">{box.winnerName}</span>(으)로 결정!
          </p>
        )}
      </div>
    </AppLink>
  )
}
