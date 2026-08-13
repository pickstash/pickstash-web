import type { ReactNode } from 'react'
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

/** 혼자 쓰는 상자(=내 것)면 '혼자 쓰는 상자', 서랍 공유로 보이는 남의 솔로 상자면 '{닉네임}의 상자'(049).
 * currentUserId가 없으면(대부분의 호출부 — 항상 내 상자만 보이는 화면) 그냥 내 것으로 간주한다. */
function ParticipantsRow({ participants, currentUserId }: { participants: HeroParticipant[]; currentUserId?: string }) {
  if (participants.length === 0) return null
  if (participants.length === 1) {
    const isMine = !currentUserId || participants[0].user_id === currentUserId
    return (
      <p className="flex items-center gap-1 text-[11.5px] text-ink-faint">
        <Icon name="box" size={13} strokeWidth={2.5} />
        {isMine ? '혼자 쓰는 상자' : `${participants[0].profiles?.nickname ?? '알 수 없음'}의 상자`}
      </p>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
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
export function BoxSummaryCard({
  card,
  note,
  currentUserId,
  trailing,
  isPrivate = false,
}: {
  card: BoxCard
  note?: string
  currentUserId?: string
  /** 카드 안쪽 하단 줄(참여자 정보 옆)에 얹을 부가 컨트롤 — 예: 폴더의 나만보기 스위치(049). absolute 대신 플로우에 포함. */
  trailing?: ReactNode
  /** 공유 서랍에서 '나만 보기'로 둔 상자(049) — 배경·테두리를 낮춰 한눈에 구분되게 + 자물쇠 표시. */
  isPrivate?: boolean
}) {
  // 나만보기 = 차분한 크림 배경 + 잉크 테두리(기본 종이/연한 테두리와 즉시 구분).
  const shell = isPrivate ? 'border-ink/20 bg-cream' : 'border-[#ECEADC] bg-paper/70'
  if (card.status === 'done') {
    return (
      <AppLink href={`/box/${card.id}`} className="block">
        <div className={`rounded-card border p-4 active:bg-butter-tint/40 ${shell}`}>
          <div className="flex items-start gap-1.5">
            {isPrivate && <Icon name="lock" size={12} strokeWidth={2.4} className="mt-[3px] shrink-0 text-ink-faint" />}
            <h3 className="min-w-0 flex-1 truncate text-[17px] font-extrabold leading-snug tracking-tight text-ink">{card.title}</h3>
          </div>
          {card.winnerName ? (
            <p className="mt-1.5 text-[13.5px] text-ink">
              <span className="font-extrabold [box-shadow:inset_0_-8px_0_#FFD84A]">{card.winnerName}</span>
              <span className="font-normal">(으)로 결정!</span>
            </p>
          ) : (
            // 마감 투표가 신호 없이 닫힌 경우(§3-3) — 배지 대신 옅은 텍스트로만(정리됨 배지 제거 결정 유지).
            <p className="mt-1.5 text-[12.5px] font-semibold text-ink-faint">결정 없이 마감</p>
          )}
          {(card.participants.length > 0 || trailing) && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <ParticipantsRow participants={card.participants} currentUserId={currentUserId} />
              {trailing}
            </div>
          )}
        </div>
      </AppLink>
    )
  }

  const box = card
  const dday = box.isAuto && box.deadlineAt ? formatDday(box.deadlineAt) : null
  const ddayUrgent = dday === 'D-day' || dday === 'D-1' || dday === '마감 지남'

  return (
    <AppLink href={`/box/${box.id}`} className="block">
      <div className={`rounded-card border p-4 active:bg-butter-tint/40 ${shell}`}>
        <div className="flex items-start justify-between gap-2">
          {isPrivate && <Icon name="lock" size={13} strokeWidth={2.4} className="mt-[3px] shrink-0 text-ink-faint" />}
          <h3 className="min-w-0 flex-1 truncate text-[17px] font-extrabold leading-snug tracking-tight text-ink">{box.title}</h3>
          {dday && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${ddayUrgent ? 'bg-tomato-tint text-tomato' : 'bg-cream text-ink-soft'}`}>
              마감 {dday}
            </span>
          )}
        </div>

        {/* 인기 리더(결정 신호)만 표시. '선택지/항목 N개' 텍스트는 제거하되, 리더가 없어도 딱 한 줄
            높이(h-[18px])만 점유해 나중에 리더가 생겨도 카드 높이가 달라지지 않게 한다. */}
        <div className="mt-2 flex h-[18px] min-w-0 items-center gap-1.5 text-[12.5px] font-extrabold text-ink">
          {box.mode !== 'checklist' && box.leaders.length > 0 && (
            <>
              <span className="shrink-0 rounded-full bg-butter px-[7px] py-px text-[10.5px] leading-tight">인기</span>
              <span className="min-w-0 truncate leading-tight">{leadersLabel(box.leaders)}</span>
            </>
          )}
        </div>

        {(box.participants.length > 0 || trailing) && (
          <div className="mt-2 flex items-center justify-between gap-2">
            <ParticipantsRow participants={box.participants} currentUserId={currentUserId} />
            {trailing}
          </div>
        )}

        {/* 들썩이는 상자 — 최근 활동 한 줄(무슨 일이 있었는지) */}
        {note && (
          <p className="mt-2.5 flex items-center gap-1.5 border-t border-[#F0EEE0] pt-2.5 text-[11.5px] font-semibold text-ink-soft">
            <Icon name="bell" size={12} strokeWidth={2.2} className="shrink-0 text-butter-dark" />
            <span className="min-w-0 truncate">{note}</span>
          </p>
        )}
      </div>
    </AppLink>
  )
}
