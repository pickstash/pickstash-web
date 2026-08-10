import type { ReactNode } from 'react'
import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { RecapRail } from '@/components/recap-rail'
import type { RecapCard } from '@/lib/api/home'

// 정리중(어질러진) 상자가 0일 때의 홈 본문. (완전 신규=서랍·상자 0은 상위에서 온보딩으로 분기됨.)
//  - 정리완료≥1  → A. 되돌아보기 회고: 빈 상태 카드 + 최근 정리완료 미니 레일(RecapRail).
//  - 정리완료 0   → B. 담백한 빈 상태 카드.
// 창고 목록의 '빈 상태'와 동일한 점선 카드로 감싸 허전함을 잡고 톤을 통일.
// 카드 안: 뱃지 + 헤드라인/서브 + '새로운 상자 만들기' 풀폭 버튼(친구 초대는 뺌).
// 플로팅 새 상자 FAB는 정리중≥1일 때만(HomeView) → 빈 홈에선 이 버튼이 주 CTA.
function EmptyCard({ badge, title, subtitle }: { badge: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 pt-9 pb-7 text-center">
      <div className="flex flex-col items-center gap-3">
        {badge}
        <div>
          <p className="text-[16px] font-extrabold tracking-tight text-ink">{title}</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{subtitle}</p>
        </div>
      </div>
      <div className="mt-6">
        <AppLink href="/box/new" className="block w-full">
          <button className="w-full rounded-field bg-ink py-4 text-sm font-extrabold text-cream active:opacity-80">
            새로운 상자 만들기
          </button>
        </AppLink>
      </div>
    </div>
  )
}

export function HomeEmpty({ doneCount, recap }: { doneCount: number; recap: RecapCard[] }) {
  if (doneCount > 0) {
    return (
      <>
        <section className="px-5 pt-1">
          <EmptyCard
            title="말끔하게 다 정리했어요"
            subtitle={`${doneCount}개의 결정이 기록으로 남았어요`}
            badge={
              // 헤더 마스코트와 안 겹치게 — '싹 쓸어 정리 완료'를 뜻하는 빗자루 뱃지
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-butter shadow-[0_4px_12px_-4px_rgba(227,185,58,0.5)]">
                <Icon name="broom" size={28} strokeWidth={2} />
              </div>
            }
          />
        </section>

        <RecapRail title="최근에 이렇게 정했어요" boxes={recap} />
      </>
    )
  }

  // B. 정리완료도 0 — 서랍만 있고 상자는 없는 상태(신규/전부삭제 복귀 공통).
  return (
    <section className="px-5 pt-1">
      <EmptyCard
        title="창고가 말끔하게 비어 있어요"
        subtitle="오늘은 무엇을 정해볼까요?"
        badge={
          // 헤더 마스코트와 안 겹치게 — 빈 상자를 뜻하는 아이콘 뱃지
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-line bg-cream">
            <Icon name="box" size={24} strokeWidth={1.8} />
          </div>
        }
      />
    </section>
  )
}
