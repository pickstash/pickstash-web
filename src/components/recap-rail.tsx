'use client'

import { AppLink, useNav } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import type { RecapCard } from '@/lib/api/home'

// 최근 정리(정리완료)된 상자 미니 레일 — 홈(정리중 아래)·빈 홈 회고에서 공용.
// 자동마감 등으로 방금 정리된 상자가 홈에서 바로 증발하지 않게 최근 것들을 노출한다.
// '전체'는 토스='상자' 탭의 정리된 필터, 웹=/done.
export function RecapRail({ title, boxes }: { title: string; boxes: RecapCard[] }) {
  const nav = useNav()
  if (boxes.length === 0) return null
  const allDoneHref = nav.platform === 'toss' ? '/boxes?filter=done' : '/done'

  return (
    <section className="pt-4">
      <div className="mb-2 flex items-center justify-between px-5">
        <h2 className="text-[12px] font-bold text-ink-soft">{title}</h2>
        <AppLink href={allDoneHref} className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-ink-faint active:opacity-70">
          전체
          <Icon name="chevronRight" size={13} strokeWidth={2.5} />
        </AppLink>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {boxes.map(box => (
          <AppLink key={box.id} href={`/box/${box.id}`} className="block shrink-0">
            <div className="flex h-[62px] w-[152px] flex-col justify-center gap-1 overflow-hidden rounded-[14px] border border-[#ECEADC] bg-paper px-3 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
              <h4 className="truncate text-[12.5px] font-extrabold leading-tight tracking-tight text-ink">
                {box.title}
              </h4>
              {box.winnerName ? (
                <span className="flex min-w-0 items-center gap-1 text-[11px] font-bold text-ink-soft">
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-butter px-1.5 py-[1px] text-[9.5px] font-extrabold text-ink">
                    결정
                  </span>
                  <span className="min-w-0 truncate">{box.winnerName}</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-ink-faint">기록으로 남김</span>
              )}
            </div>
          </AppLink>
        ))}
      </div>
    </section>
  )
}
