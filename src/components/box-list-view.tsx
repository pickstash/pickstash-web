'use client'

import type { ReactNode } from 'react'
import { AppLink } from '@/lib/nav/nav'
import { BoxCard } from '@/components/box-card'
import { PageHeader } from '@/components/page-header'
import { AppDrawer } from '@/components/app-drawer'
import type { BoxListItem, BoxListKind } from '@/lib/api/box-list'

// 창고 목록 프리젠테이션 — 어질러진/정리된/즐겨찾는 3화면 공유(웹·토스). 데이터는 loadBoxList가 계산.
interface BoxListViewProps {
  title: string
  description: ReactNode
  nickname: string
  items: BoxListItem[]
  emptyTitle: string
  emptyDesc: string
  /** '새로운 상자 만들기' 하단 고정 CTA (어질러진 창고 전용) */
  showCreateCta?: boolean
}

// 화면별 문구를 단일 소스로 — 웹 페이지·토스 스크린이 이 메타를 그대로 쓴다.
export const BOX_LIST_META: Record<
  BoxListKind,
  Pick<BoxListViewProps, 'title' | 'description' | 'emptyTitle' | 'emptyDesc' | 'showCreateCta'>
> = {
  messy: {
    title: '어질러진 창고',
    description: (
      <>
        아직 정리 중인 상자들이에요.
        <br />
        후보를 더하고 투표해서 하나씩 결정해보세요.
      </>
    ),
    emptyTitle: '아직 상자가 없어요',
    emptyDesc: '고민이 생기면 상자에 담아보세요!',
    showCreateCta: true,
  },
  done: {
    title: '정리된 창고',
    description: '결정이 끝난 상자들이 기록으로 남아있어요.',
    emptyTitle: '아직 정리된 상자가 없어요',
    emptyDesc: '첫 결정을 내려보세요!',
  },
  favorites: {
    title: '즐겨찾는 창고',
    description: '다시 꺼내보고 싶은 상자들이 모였어요.',
    emptyTitle: '즐겨찾는 상자가 없어요',
    emptyDesc: '상자 상세에서 별 아이콘을 눌러 담아두세요!',
  },
}

export function BoxListView({ title, description, nickname, items, emptyTitle, emptyDesc, showCreateCta }: BoxListViewProps) {
  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title={title} right={<AppDrawer nickname={nickname} />} />

      <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-soft">{description}</p>

      <div className={`flex-1 space-y-2.5 px-5 ${showCreateCta ? 'pb-28' : 'pb-10'}`}>
        {items.length > 0 ? (
          items.map(({ box, participants, winnerName, isNew, isFavorite }) => (
            <BoxCard
              key={box.id}
              box={box}
              participants={participants}
              winnerName={winnerName}
              isNew={isNew}
              isFavorite={isFavorite}
            />
          ))
        ) : (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">{emptyTitle}</p>
            <p className="mt-1 text-[12px] text-ink-soft">{emptyDesc}</p>
          </div>
        )}
      </div>

      {showCreateCta && (
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
