import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { formatDday } from '@/lib/utils'
import { leadersLabel, type HeroParticipant, type OpenBoxCard } from '@/components/decision-hero'

/** 미니 카드용 소형 참여자 아바타 스택 (히어로보다 작게). */
function RailAvatars({ participants, max = 3 }: { participants: HeroParticipant[]; max?: number }) {
  const shown = participants.slice(0, max)
  const extra = participants.length - shown.length
  return (
    <div className="flex -space-x-1">
      {shown.map(p => (
        <div key={p.user_id} className="flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-paper bg-cream text-[8px] font-bold text-ink">
          {p.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            p.profiles?.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] border-paper bg-cream text-[8px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

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
          <AppLink href="/messy" className="text-[12px] font-semibold text-ink-faint active:opacity-70">
            전체 {totalOpen} ›
          </AppLink>
        )}
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {boxes.map(box => (
          <AppLink key={box.id} href={`/box/${box.id}`} className="block shrink-0">
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

              {box.isSolo ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {box.isAuto && box.deadlineAt && <DeadlineChip deadlineAt={box.deadlineAt} />}
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint">
                    <Icon name="box" size={11} />
                    혼자 쓰는 상자
                  </span>
                </div>
              ) : (
                <>
                  {/* 마감 · 1위 · 좋아요 (있는 것만) */}
                  {((box.isAuto && box.deadlineAt) || box.leaders.length > 0 || box.totalLikes > 0) && (
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {box.isAuto && box.deadlineAt && <DeadlineChip deadlineAt={box.deadlineAt} />}
                      {box.leaders.length > 0 && (
                        <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-[11.5px] font-bold text-ink">
                          <span className="shrink-0 whitespace-nowrap rounded-full bg-butter px-1.5 py-0.5 text-[10px] font-extrabold">
                            {box.leaders.length > 1 ? '공동 1위' : '1위'}
                          </span>
                          <span className="min-w-0 truncate">{leadersLabel(box.leaders)}</span>
                        </span>
                      )}
                      {box.totalLikes > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-ink-faint tabular-nums">
                          <Icon name="heart" size={11} />
                          {box.totalLikes}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 누가 참여 중인지 — 1위 유무와 무관하게 항상 노출 */}
                  {box.participants.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      <RailAvatars participants={box.participants} />
                      <span className="text-[11px] font-semibold text-ink-faint">{box.participants.length}명 참여 중</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </AppLink>
        ))}
      </div>
    </section>
  )
}
