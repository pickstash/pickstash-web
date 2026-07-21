import Link from 'next/link'
import { getBoxStatus, BOX_STATUS_LABEL, type BoxStatus } from '@/lib/domain/box-status'
import { formatKoreanDate, formatDeadline } from '@/lib/utils'
import type { Box } from '@/lib/api/boxes'

interface BoxCardProps {
  box: Box
  participantCount?: number
  winnerName?: string | null
  /** 공동 1등 개수 (2 이상이면 동점 상태 표시) */
  coLeaderCount?: number
  isNew?: boolean
  isFavorite?: boolean
}

const STATUS_BADGE_CLASS: Record<BoxStatus, string> = {
  RESOLVED: 'bg-leaf-tint text-[#37714A]',
  EXPIRED: 'bg-[#EDEBDD] text-ink-soft',
  SHOWDOWN: 'bg-tangerine text-[#FFF7EC]',
  OPEN: 'border border-[#D9D6C2] bg-paper text-ink-soft',
}

export function BoxCard({ box, participantCount, winnerName, coLeaderCount, isNew, isFavorite }: BoxCardProps) {
  const status = getBoxStatus(box)

  return (
    <Link href={`/box/${box.id}`} className="block">
      <div className="rounded-card border border-[#ECEADC] bg-paper p-4 shadow-[0_2px_10px_rgba(42,42,39,0.05)] transition-colors active:bg-butter-tint/40">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <h3 className="truncate text-[15.5px] font-extrabold leading-snug tracking-tight text-ink">
              {box.title}
            </h3>
            {isNew && (
              <span className="shrink-0 rounded-full bg-butter px-2 py-0.5 text-[11px] font-extrabold text-ink">
                N
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isFavorite && <span className="text-sm">⭐</span>}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[status]}`}>
              {status === 'SHOWDOWN' ? '🔥 결판 중' : BOX_STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        {winnerName && (
          <p className="mt-2 text-[13.5px] font-extrabold text-ink">
            <span className="[box-shadow:inset_0_-8px_0_#FFD84A]">{winnerName}</span>
            (으)로 결정!
          </p>
        )}
        {!winnerName && coLeaderCount !== undefined && coLeaderCount >= 2 && (
          <p className="mt-2 text-[12.5px] font-bold text-tangerine">
            공동 1등 {coLeaderCount}개 — 재투표로 정해보세요
          </p>
        )}

        <div className="mt-2 space-y-0.5 text-[11.5px] leading-relaxed text-ink-faint">
          <p>생성일 {formatKoreanDate(box.created_at)}</p>
          <p>마감일 {formatDeadline(box.deadline_at)}</p>
        </div>

        {participantCount !== undefined && (
          <p className="mt-2 text-[11.5px] text-ink-faint">{participantCount}명 참여 중</p>
        )}
      </div>
    </Link>
  )
}
