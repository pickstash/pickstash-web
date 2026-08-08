import type { ReactNode } from 'react'
import { AppLink, useNav } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import type { RecapCard } from '@/lib/api/home'

// 정리중(어질러진) 상자가 0일 때의 홈 본문. (완전 신규=서랍·상자 0은 상위에서 온보딩으로 분기됨.)
//  - 정리완료≥1  → A. 되돌아보기 회고: 빈 상태 카드 + 최근 정리완료 3개 미니 레일.
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
  const nav = useNav()
  // 토스는 '상자' 탭(/boxes)의 '정리된' 필터로 이동 → 별도 화면 대신 탭 액티브로. 웹은 /done 화면 유지.
  const allDoneHref = nav.platform === 'toss' ? '/boxes?filter=done' : '/done'

  if (doneCount > 0) {
    return (
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

        {recap.length > 0 && (
          <div className="pt-7">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-[12px] font-bold text-ink-soft">최근에 이렇게 정했어요</h2>
              <AppLink href={allDoneHref} className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-ink-faint active:opacity-70">
                전체
                <Icon name="chevronRight" size={13} strokeWidth={2.5} />
              </AppLink>
            </div>
            <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recap.map(box => (
                <AppLink key={box.id} href={`/box/${box.id}`} className="block shrink-0">
                  <div className="flex h-[112px] w-[168px] flex-col overflow-hidden rounded-[18px] border border-[#ECEADC] bg-paper p-3.5 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
                    <h4 className="line-clamp-2 text-[13px] font-extrabold leading-snug tracking-tight text-ink">
                      {box.title}
                    </h4>
                    {box.winnerName ? (
                      <span className="mt-auto flex min-w-0 items-center gap-1 text-[11.5px] font-bold text-ink">
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-butter px-1.5 py-0.5 text-[10px] font-extrabold">
                          결정
                        </span>
                        <span className="min-w-0 truncate">{box.winnerName}</span>
                      </span>
                    ) : (
                      <span className="mt-auto text-[11px] font-semibold text-ink-faint">기록으로 남김</span>
                    )}
                  </div>
                </AppLink>
              ))}
            </div>
          </div>
        )}
      </section>
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
