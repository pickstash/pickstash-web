import { Icon } from '@/components/icon'
import { BoxSummaryCard } from '@/components/box-summary-card'
import type { BoxCard, HomeBrief, ShakingItem } from '@/lib/domain/home'

// 홈 브리핑 — 서랍 레일 '브리핑' 칩의 내용물. "돌아왔을 때 놓치면 안 되는 것"만.
// ① 최근에 이렇게 정했어요(7일 이내 정리완료) → ② 들썩이는 상자(7일 이내 다른 사람 활동).
// 전체 상자 브라우징은 상자 탭이 전담. 각 섹션은 카드가 있을 때만 노출.
function popStyle(i: number) {
  return {
    className: '[animation-fill-mode:backwards] animate-[drawerPop_0.4s_cubic-bezier(.16,1,.3,1)]',
    style: { animationDelay: `${i * 55}ms` },
  }
}

function DoneSection({ cards }: { cards: BoxCard[] }) {
  if (cards.length === 0) return null
  return (
    <section>
      <p className="mb-2 px-1 text-[13px] font-bold text-ink-soft">최근에 이렇게 정했어요</p>
      <div className="space-y-2.5">
        {cards.map((card, i) => (
          <div key={card.id} {...popStyle(i)}>
            <BoxSummaryCard card={card} />
          </div>
        ))}
      </div>
    </section>
  )
}

function ShakingSection({ items }: { items: ShakingItem[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <p className="mb-2 px-1 text-[13px] font-bold text-ink-soft">들썩이는 상자</p>
      <div className="space-y-2.5">
        {items.map((item, i) => (
          <div key={item.card.id} {...popStyle(i)}>
            <BoxSummaryCard card={item.card} note={item.note} />
          </div>
        ))}
      </div>
    </section>
  )
}

export function HomeBriefView({ brief }: { brief: HomeBrief }) {
  const empty = brief.recentDone.length === 0 && brief.shaking.length === 0

  // 상자는 있지만 브리핑이 빌 때 — 홈이 허전하지 않게 조용한 안내. 서랍 칩이 바로 위에 있다.
  if (empty) {
    return (
      <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-butter-tint text-ink">
            <Icon name="check" size={16} strokeWidth={2.4} />
          </span>
          <p className="text-[13.5px] font-bold text-ink">새로 챙길 소식이 없어요</p>
          <p className="text-[12px] leading-relaxed text-ink-soft">서랍을 눌러 상자를 살펴보거나<br />새 상자를 만들어보세요</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <DoneSection cards={brief.recentDone} />
      <ShakingSection items={brief.shaking} />
    </div>
  )
}
