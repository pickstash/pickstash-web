import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { formatDday } from '@/lib/utils'
import { leadersLabel } from '@/components/decision-hero'
import type { BoxCard, HeroParticipant } from '@/lib/domain/home'

/** 카드용 작은 겹침 아바타 스택 — box-card.tsx의 CardAvatars와 동일 톤(파일마다 로컬 정의하는 기존 관례). */
function CardAvatars({ participants, max = 4 }: { participants: HeroParticipant[]; max?: number }) {
  const shown = participants.slice(0, max)
  const extra = participants.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map(p => (
        <div key={p.user_id} className="h-5 w-5 overflow-hidden rounded-full border border-paper bg-butter-tint">
          {p.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[8px] font-bold text-ink">
              {p.profiles?.nickname?.[0] ?? '?'}
            </div>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-paper bg-cream text-[8px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

/** 혼자 쓰는 상자 / 참여자 아바타+"N명 참여 중" — box-card.tsx(상자 탭)와 동일 문구·스타일. */
function ParticipantsRow({ participants }: { participants: HeroParticipant[] }) {
  if (participants.length === 0) return null
  return participants.length === 1 ? (
    <p className="mt-2 flex items-center gap-1 text-[11.5px] text-ink-faint">
      <Icon name="box" size={13} strokeWidth={2.5} />
      혼자 쓰는 상자
    </p>
  ) : (
    <div className="mt-2 flex items-center gap-1.5">
      <CardAvatars participants={participants} />
      <span className="text-[11.5px] text-ink-faint">{participants.length}명 참여 중</span>
    </div>
  )
}

/**
 * 홈 서랍 레일("전체"/서랍별)이 쓰는 단일 상자 카드 — 열림/닫힘 모두 렌더.
 * home-stream-card.tsx(열림 전용) + 인라인 DoneCard(home-view.tsx)를 대체·흡수.
 * 모드 칩·즐겨찾기 별·좋아요·댓글·정리됨 배지는 의도적으로 없음(리디자인 확정 사항).
 */
export function BoxSummaryCard({ card }: { card: BoxCard }) {
  if (card.status === 'done') {
    return (
      <AppLink href={`/box/${card.id}`} className="block">
        <div className="rounded-card border border-[#ECEADC] bg-paper/70 p-4 active:bg-butter-tint/40">
          <h3 className="truncate text-[17px] font-extrabold leading-snug tracking-tight text-ink-soft">{card.title}</h3>
          {card.winnerName ? (
            <p className="mt-1.5 text-[13.5px] text-ink">
              <span className="font-extrabold [box-shadow:inset_0_-8px_0_#FFD84A]">{card.winnerName}</span>
              <span className="font-normal">(으)로 결정!</span>
            </p>
          ) : (
            // 마감 투표가 신호 없이 닫힌 경우(§3-3) — 배지 대신 옅은 텍스트로만(정리됨 배지 제거 결정 유지).
            <p className="mt-1.5 text-[12.5px] font-semibold text-ink-faint">결정 없이 마감</p>
          )}
          <ParticipantsRow participants={card.participants} />
        </div>
      </AppLink>
    )
  }

  const box = card
  const dday = box.isAuto && box.deadlineAt ? formatDday(box.deadlineAt) : null
  const ddayUrgent = dday === 'D-day' || dday === 'D-1' || dday === '마감 지남'

  return (
    <AppLink href={`/box/${box.id}`} className="block">
      <div className="rounded-card border border-[#ECEADC] bg-paper p-4 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 flex-1 truncate text-[17px] font-extrabold leading-snug tracking-tight text-ink">{box.title}</h3>
          {dday && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${ddayUrgent ? 'bg-tomato-tint text-tomato' : 'bg-cream text-ink-soft'}`}>
              마감 {dday}
            </span>
          )}
        </div>

        {box.mode === 'checklist' ? (
          <p className="mt-2 flex items-center gap-1 text-[12.5px] font-bold text-ink-soft">
            <Icon name="check" size={13} strokeWidth={2.5} />
            {box.checked}/{box.total} 체크
          </p>
        ) : box.leaders.length > 0 ? (
          <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
            <span className="shrink-0 rounded-full bg-butter px-[7px] py-0.5 text-[10.5px]">인기</span>
            <span className="min-w-0 truncate">{leadersLabel(box.leaders)}</span>
          </div>
        ) : (
          <p className="mt-2 text-[12.5px] font-bold text-ink-soft">선택지 {box.total}개</p>
        )}

        <ParticipantsRow participants={box.participants} />
      </div>
    </AppLink>
  )
}
