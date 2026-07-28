import Link from 'next/link'
import { Icon } from '@/components/icon'
import { formatDday } from '@/lib/utils'

type QueueParticipant = { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }

export interface QueueCard {
  id: string
  title: string
  isNew: boolean
  isFavorite: boolean
  isSolo: boolean
  isAuto: boolean
  deadlineAt: string | null
  participants: QueueParticipant[]
  totalLikes: number
  leaderName: string | null
}

/** 카드용 작은 겹침 아바타 */
function MiniAvatars({ participants, max = 3 }: { participants: QueueParticipant[]; max?: number }) {
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

function DeadlineChip({ deadlineAt }: { deadlineAt: string }) {
  const label = formatDday(deadlineAt)
  const urgent = label === 'D-day' || label === 'D-1' || label === '마감 지남'
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
        urgent ? 'bg-tomato-tint text-tomato' : 'bg-cream text-ink-soft'
      }`}
    >
      <Icon name="calendar" size={11} />
      마감 {label}
    </span>
  )
}

/**
 * "정할 차례예요" — 정리중(OPEN) 상자를 할 일처럼 카드로 노출. 메인의 히어로.
 * NEW(내 확인 이후 변경) 먼저 → 마감 임박 → 최근 순으로 정렬된 items를 그대로 렌더한다.
 */
export function DecisionQueueSection({ items, totalOpen }: { items: QueueCard[]; totalOpen: number }) {
  return (
    <section className="px-5 pt-4">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <h2 className="flex items-center gap-1.5 text-[14px] font-extrabold text-ink">
          정할 차례예요
          {totalOpen > 0 && <span className="tabular-nums text-ink-faint">{totalOpen}</span>}
        </h2>
        {totalOpen > items.length && (
          <Link href="/messy" className="text-[12px] font-semibold text-ink-faint active:opacity-70">
            더보기 ›
          </Link>
        )}
      </div>

      {items.length > 0 ? (
        <div className="space-y-2.5">
          {items.map(item => (
            <Link key={item.id} href={`/box/${item.id}`} className="block">
              <div className="rounded-card border border-[#ECEADC] bg-paper p-4 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <h3 className="truncate text-[15px] font-extrabold leading-snug tracking-tight text-ink">
                      {item.title}
                    </h3>
                    {item.isNew && (
                      <span className="shrink-0 rounded-full bg-butter px-1.5 py-0.5 text-[10.5px] font-extrabold text-ink">
                        N
                      </span>
                    )}
                  </div>
                  {item.isFavorite && (
                    <Icon
                      name="star"
                      size={15}
                      strokeWidth={1.5}
                      style={{ fill: 'var(--color-butter)', stroke: 'var(--color-butter-dark)' }}
                    />
                  )}
                </div>

                {/* 상태 메타: 마감 · 좋아요 · 지금 1위 (혼자 상자는 좋아요/1위 미표시) */}
                <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  {item.isAuto && item.deadlineAt && <DeadlineChip deadlineAt={item.deadlineAt} />}
                  {!item.isSolo && item.leaderName ? (
                    <span className="flex items-center gap-1 text-[12px] font-bold text-ink">
                      <span className="rounded-full bg-butter px-1.5 py-0.5 text-[10.5px] font-extrabold">
                        지금 1위
                      </span>
                      <span className="truncate">{item.leaderName}</span>
                    </span>
                  ) : null}
                  {!item.isSolo && item.totalLikes > 0 && (
                    <span className="flex items-center gap-1 text-[12px] font-bold text-ink-faint">
                      <Icon name="heart" size={12} />
                      <span className="tabular-nums">{item.totalLikes}</span>
                    </span>
                  )}
                  {item.isSolo && (
                    <span className="flex items-center gap-1 text-[11.5px] text-ink-faint">
                      <Icon name="box" size={12} />
                      혼자 쓰는 상자
                    </span>
                  )}
                </div>

                {!item.isSolo && item.participants.length > 1 && (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <MiniAvatars participants={item.participants} />
                    <span className="text-[11px] text-ink-faint">{item.participants.length}명 참여 중</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-8 text-center">
          <p className="text-[13.5px] font-bold text-ink">지금 정할 상자가 없어요</p>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
            새 상자를 만들거나 친구 상자에 참여하면<br />여기에 모여요.
          </p>
        </div>
      )}
    </section>
  )
}
