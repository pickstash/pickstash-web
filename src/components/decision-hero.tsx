import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { formatDday } from '@/lib/utils'
import type { HeroParticipant, OpenBoxCard } from '@/lib/domain/home'

// 타입은 공유 도메인(home.ts)에 단일 정의 — 기존 임포터 호환 위해 여기서 re-export.
export type { HeroParticipant, OpenBoxCard }

/** 1위 이름 라벨: 여럿(공동)이면 첫 이름 + "외 N개". */
export function leadersLabel(leaders: string[]): string {
  if (leaders.length <= 1) return leaders[0] ?? ''
  return `${leaders[0]} 외 ${leaders.length - 1}개`
}

function HeroAvatars({ participants, max = 4 }: { participants: HeroParticipant[]; max?: number }) {
  const shown = participants.slice(0, max)
  const extra = participants.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map(p => (
        <div key={p.user_id} className="flex h-[22px] w-[22px] items-center justify-center overflow-hidden rounded-full border border-paper bg-paper text-[9px] font-bold text-ink">
          {p.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            p.profiles?.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-paper bg-cream text-[9px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

/**
 * 메인 히어로 — 가장 급한(마감 임박) 정리중 상자 하나를 큰 카드로.
 * 홈의 임팩트 지점. '인기'는 좋아요 최다가 단독+2개 이상일 때만(동점·1개는 미표시).
 * 정리중 0(box 없음)일 때의 빈 홈은 HomeView가 HomeEmpty로 분기한다.
 */
export function DecisionHero({ box }: { box: OpenBoxCard }) {
  const dday = box.isAuto && box.deadlineAt ? formatDday(box.deadlineAt) : null
  const ddayUrgent = dday === 'D-day' || dday === 'D-1' || dday === '마감 지남'

  return (
    <section className="px-5">
      <AppLink href={`/box/${box.id}`} className="block">
        <div className="rounded-[24px] border border-butter-deep bg-butter-tint px-[18px] py-[12px] shadow-[0_6px_18px_-6px_rgba(227,185,58,0.35)] active:brightness-[0.98]">
          <div className="flex items-start justify-between gap-2.5">
            <h3 className="min-w-0 text-[21px] font-extrabold leading-tight tracking-tight text-ink text-balance">
              {box.title}
            </h3>
            <div className="flex shrink-0 items-start gap-2">
              {box.isFavorite && (
                <Icon
                  name="star"
                  size={16}
                  strokeWidth={1.5}
                  style={{ fill: 'var(--color-butter)', stroke: 'var(--color-butter-dark)', marginTop: 3 }}
                />
              )}
              {dday && (
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-extrabold tabular-nums ${
                    ddayUrgent ? 'bg-tomato-tint text-tomato' : 'bg-cream text-ink-soft'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${ddayUrgent ? 'bg-tomato' : 'bg-ink-faint'}`} />
                  마감 {dday}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {box.mode === 'checklist' ? (
              /* 체크형: 좋아요/1위 대신 진행률 */
              <span className="flex items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
                <Icon name="check" size={13} strokeWidth={2.5} />
                {box.checked}/{box.total} 체크
              </span>
            ) : (
              <>
                {!box.isSolo && box.leaders.length > 0 && (
                  <span className="flex min-w-0 max-w-full items-start gap-1.5 text-[12.5px] font-extrabold text-ink">
                    <span className="shrink-0 whitespace-nowrap rounded-full bg-butter px-[7px] py-0.5 text-[10.5px] font-extrabold">
                      인기
                    </span>
                    <span className="min-w-0 break-words">{leadersLabel(box.leaders)}</span>
                  </span>
                )}
                {!box.isSolo && box.totalLikes > 0 && (
                  <span className="flex items-center gap-1 text-[12.5px] font-extrabold text-ink-soft tabular-nums">
                    <Icon name="heart" size={13} />
                    {box.totalLikes}
                  </span>
                )}
                {!box.isSolo && box.totalComments > 0 && (
                  <span className="flex items-center gap-1 text-[12.5px] font-extrabold text-ink-soft tabular-nums">
                    <Icon name="comment" size={13} />
                    {box.totalComments}
                  </span>
                )}
                {box.isSolo && (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-ink-soft">
                    <Icon name="box" size={12} />
                    혼자 쓰는 상자
                  </span>
                )}
              </>
            )}
          </div>

          <div className="mt-[12px] flex items-center justify-between border-t border-[rgba(227,185,58,0.35)] pt-[10px]">
            {!box.isSolo && box.participants.length > 1 ? (
              <div className="flex items-center gap-1.5">
                <HeroAvatars participants={box.participants} />
                <span className="text-[11.5px] font-semibold text-ink-soft">{box.participants.length}명 참여 중</span>
              </div>
            ) : (
              <span className="text-[11.5px] font-semibold text-ink-soft">천천히 골라보세요</span>
            )}
            <span className="flex items-center gap-0.5 rounded-full bg-ink py-2 pl-3.5 pr-2.5 text-[12.5px] font-extrabold text-cream">
              정하러 가기
              <Icon name="chevronRight" size={14} strokeWidth={2.5} />
            </span>
          </div>
        </div>
      </AppLink>
    </section>
  )
}
