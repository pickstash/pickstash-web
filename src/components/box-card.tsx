import Link from 'next/link'
import { getBoxStatus, BOX_STATUS_LABEL, type BoxStatus } from '@/lib/domain/box-status'
import { formatKoreanDate, formatDeadline } from '@/lib/utils'
import { Icon } from '@/components/icon'
import type { Box } from '@/lib/api/boxes'

type CardParticipant = { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }

interface BoxCardProps {
  box: Box
  participants?: CardParticipant[]
  winnerName?: string | null
  isNew?: boolean
  isFavorite?: boolean
}

/** 카드용 작은 겹침 아바타 스택 */
function CardAvatars({ participants, max = 4 }: { participants: CardParticipant[]; max?: number }) {
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

const STATUS_BADGE_CLASS: Record<BoxStatus, string> = {
  RESOLVED: 'bg-leaf-tint text-[#37714A]',
  OPEN: 'border border-[#D9D6C2] bg-paper text-ink-soft',
}

export function BoxCard({ box, participants, winnerName, isNew, isFavorite }: BoxCardProps) {
  const status = getBoxStatus(box)
  const isAuto = box.decision_mode === 'auto_deadline'

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
            {isFavorite && (
              <Icon
                name="star"
                size={15}
                strokeWidth={1.5}
                style={{ fill: 'var(--color-butter)', stroke: 'var(--color-butter-dark)' }}
              />
            )}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE_CLASS[status]}`}>
              {BOX_STATUS_LABEL[status]}
            </span>
          </div>
        </div>

        {winnerName && (
          <p className="mt-2 text-[13.5px] font-extrabold text-ink">
            <span className="[box-shadow:inset_0_-8px_0_#FFD84A]">{winnerName}</span>
            (으)로 결정!
          </p>
        )}

        <div className="mt-2 space-y-0.5 text-[11.5px] leading-relaxed text-ink-faint">
          <p>생성일 {formatKoreanDate(box.created_at)}</p>
          {isAuto && <p>마감일 {formatDeadline(box.deadline_at)}</p>}
        </div>

        {participants && participants.length > 0 && (
          participants.length === 1 ? (
            <p className="mt-2 flex items-center gap-1 text-[11.5px] text-ink-faint">
              <Icon name="box" size={12} />
              혼자 쓰는 상자
            </p>
          ) : (
            <div className="mt-2 flex items-center gap-1.5">
              <CardAvatars participants={participants} />
              <span className="text-[11.5px] text-ink-faint">{participants.length}명 참여 중</span>
            </div>
          )
        )}
      </div>
    </Link>
  )
}
