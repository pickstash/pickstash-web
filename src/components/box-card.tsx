import { AppLink } from '@/lib/nav/nav'
import { formatDeadline } from '@/lib/utils'
import { Icon } from '@/components/icon'
import { ModeChip } from '@/components/mode-chip'
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

export function BoxCard({ box, participants, winnerName, isFavorite }: BoxCardProps) {
  const isAuto = box.decision_mode === 'auto_deadline'
  const checklist = box.mode === 'checklist'

  return (
    <AppLink href={`/box/${box.id}`} className="block">
      <div className="rounded-card border border-[#ECEADC] bg-paper/70 p-4 transition-colors active:bg-butter-tint/40">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {/* 모드 라벨 — 공유 ModeChip(정리중/정리완료 배지는 제거). */}
            <ModeChip mode={checklist ? 'checklist' : 'decide'} />
            <h3 className="mt-1.5 truncate text-[15.5px] font-extrabold leading-snug tracking-tight text-ink">
              {box.title}
            </h3>
          </div>
          {isFavorite && (
            <Icon
              name="bookmark"
              size={15}
              strokeWidth={1.5}
              className="shrink-0"
              style={{ fill: 'var(--color-butter)', stroke: 'var(--color-butter-dark)' }}
            />
          )}
        </div>

        {winnerName && (
          <p className="mt-2 text-[13.5px] font-extrabold text-ink">
            <span className="[box-shadow:inset_0_-8px_0_#FFD84A]">{winnerName}</span>
            (으)로 결정!
          </p>
        )}

        {isAuto && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">마감일 {formatDeadline(box.deadline_at)}</p>
        )}

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
    </AppLink>
  )
}
