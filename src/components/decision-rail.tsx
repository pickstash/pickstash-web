import Link from 'next/link'
import { Icon } from '@/components/icon'
import { formatDday } from '@/lib/utils'
import { leadersLabel, type OpenBoxCard } from '@/components/decision-hero'

function DeadlineChip({ deadlineAt }: { deadlineAt: string }) {
  const label = formatDday(deadlineAt)
  const urgent = label === 'D-day' || label === 'D-1' || label === '마감 지남'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        urgent ? 'bg-tomato-tint text-tomato' : 'bg-cream text-ink-soft'
      }`}
    >
      <Icon name="calendar" size={11} />
      마감 {label}
    </span>
  )
}

/**
 * "이어서 정리할 상자" — 히어로 다음으로 정리할 상자들을 가로 스크롤 미니 카드로.
 * 세로 리스트(창고 화면)와 리듬을 다르게 해 홈과 목록을 구분한다.
 * boxes가 비면(예: 어질러진 상자가 히어로 1개뿐) 섹션 자체를 렌더하지 않는다.
 */
export function DecisionRail({ boxes, totalOpen }: { boxes: OpenBoxCard[]; totalOpen: number }) {
  if (boxes.length === 0) return null

  return (
    <section className="pt-5">
      <div className="mb-2.5 flex items-center justify-between px-5">
        <h2 className="text-[14px] font-extrabold text-ink">이어서 정리할 상자</h2>
        {totalOpen > boxes.length + 1 && (
          <Link href="/messy" className="text-[12px] font-semibold text-ink-faint active:opacity-70">
            전체 {totalOpen} ›
          </Link>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {boxes.map(box => (
          <Link key={box.id} href={`/box/${box.id}`} className="block shrink-0">
            <div className="flex w-[176px] flex-col gap-2.5 rounded-[18px] border border-[#ECEADC] bg-paper p-3.5 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
              <div className="flex items-start gap-1.5">
                <h4 className="line-clamp-2 min-h-[36px] flex-1 text-[14px] font-extrabold leading-snug tracking-tight text-ink">
                  {box.title}
                </h4>
                {box.isNew && (
                  <span className="mt-0.5 shrink-0 rounded-full bg-butter px-1.5 py-0.5 text-[10px] font-extrabold text-ink">
                    N
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                {box.isAuto && box.deadlineAt && <DeadlineChip deadlineAt={box.deadlineAt} />}
                {box.isSolo ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint">
                    <Icon name="box" size={11} />
                    혼자 쓰는 상자
                  </span>
                ) : box.leaders.length > 0 ? (
                  <>
                    <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-ink">
                      <span className="rounded-full bg-butter px-1.5 py-0.5 text-[10px] font-extrabold">
                        {box.leaders.length > 1 ? '공동 1위' : '1위'}
                      </span>
                      <span className="truncate">{leadersLabel(box.leaders)}</span>
                    </span>
                    {box.totalLikes > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-faint tabular-nums">
                        <Icon name="heart" size={11} />
                        {box.totalLikes}
                      </span>
                    )}
                  </>
                ) : box.totalLikes > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-faint tabular-nums">
                    <Icon name="heart" size={11} />
                    {box.totalLikes}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-ink-faint">아직 좋아요 없음</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
