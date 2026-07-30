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
        <div key={p.user_id} className="flex h-[22px] w-[22px] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-butter-tint bg-paper text-[9px] font-bold text-ink">
          {p.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            p.profiles?.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-butter-tint bg-cream text-[9px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

/**
 * 메인 히어로 — 가장 급한(마감 임박) 정리중 상자 하나를 큰 카드로. box=null이면 여유 빈 상태.
 * 홈의 임팩트 지점. 좋아요 동점이면 "공동 1위"로 함께 표시.
 */
export function DecisionHero({ box }: { box: OpenBoxCard | null }) {
  if (!box) {
    return (
      <section className="px-5 pt-4">
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-10 text-center">
          {/*<Image src="/icons/character.png" alt="" width={72} height={54} className="h-[54px] w-auto" />*/}
          <div>
            <p className="text-[14px] font-extrabold text-ink">지금 정리할 상자가 없어요</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              새 상자를 만들거나 친구 상자에 참여하면<br />여기에 모여요.
            </p>
          </div>
        </div>
      </section>
    )
  }

  const dday = box.isAuto && box.deadlineAt ? formatDday(box.deadlineAt) : null

  return (
    <section className="px-5 pt-4">
      <AppLink href={`/box/${box.id}`} className="block">
        <div className="rounded-[24px] border border-butter-deep bg-butter-tint p-[18px] shadow-[0_6px_18px_-6px_rgba(227,185,58,0.35)] active:brightness-[0.98]">
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
                <div className="shrink-0 rounded-[14px] bg-paper px-[11px] py-[7px] text-center shadow-[0_2px_6px_rgba(42,42,39,0.08)]">
                  <div className="text-[18px] font-extrabold leading-none text-tomato tabular-nums">{dday}</div>
                  <div className="mt-0.5 text-[9.5px] font-bold text-ink-faint">마감</div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            {!box.isSolo && box.leaders.length > 0 && (
              <span className="flex min-w-0 max-w-full items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
                <span className="shrink-0 whitespace-nowrap rounded-full bg-butter px-[7px] py-0.5 text-[10.5px] font-extrabold">
                  {box.leaders.length > 1 ? '공동 1위' : '지금 1위'}
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
            {box.isNew && (
              <span className="rounded-full bg-butter px-1.5 py-0.5 text-[10px] font-extrabold text-ink">N</span>
            )}
            {box.isSolo && (
              <span className="flex items-center gap-1 text-[12px] font-semibold text-ink-soft">
                <Icon name="box" size={12} />
                혼자 쓰는 상자
              </span>
            )}
          </div>

          <div className="mt-[15px] flex items-center justify-between border-t border-[rgba(227,185,58,0.35)] pt-[13px]">
            {!box.isSolo && box.participants.length > 1 ? (
              <div className="flex items-center gap-1.5">
                <HeroAvatars participants={box.participants} />
                <span className="text-[11.5px] font-semibold text-ink-soft">{box.participants.length}명 참여 중</span>
              </div>
            ) : (
              <span className="text-[11.5px] font-semibold text-ink-soft">천천히 골라보세요</span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-ink px-3.5 py-2 text-[12.5px] font-extrabold text-cream">
              정하러 가기 ›
            </span>
          </div>
        </div>
      </AppLink>
    </section>
  )
}
