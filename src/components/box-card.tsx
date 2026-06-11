import Link from 'next/link'
import { getBoxStatus } from '@/lib/domain/box-status'
import { formatKoreanDateTime, formatKoreanDate } from '@/lib/utils'
import type { Box } from '@/lib/api/boxes'

interface BoxCardProps {
  box: Box
  participantCount?: number
  winnerName?: string | null
  isNew?: boolean
  isFavorite?: boolean
}

export function BoxCard({ box, participantCount, winnerName, isNew, isFavorite }: BoxCardProps) {
  const status = getBoxStatus(box)

  const statusLabel =
    status === 'RESOLVED' ? '정리완료!' :
    status === 'EXPIRED' ? (winnerName ? null : '투표없이 마감됐어요.') :
    null

  return (
    <Link href={`/box/${box.id}`}>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 active:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base leading-snug truncate">{box.title}</h3>
            {isNew && (
              <span className="shrink-0 text-xs font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full">
                N
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isFavorite && <span className="text-yellow-400 text-sm">★</span>}
            {status === 'SHOWDOWN' && (
              <span className="text-xs font-medium bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                결판 중
              </span>
            )}
            {statusLabel && (
              <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {statusLabel}
              </span>
            )}
          </div>
        </div>

        {winnerName && (
          <p className="mt-1.5 text-sm font-semibold text-blue-600">
            {winnerName}(으)로 결정!
          </p>
        )}

        <div className="mt-2 space-y-0.5 text-xs text-gray-400">
          <p>생성일 {formatKoreanDate(box.created_at)}</p>
          <p>마감일 {formatKoreanDateTime(box.deadline_at)}</p>
        </div>

        {participantCount !== undefined && (
          <p className="mt-2 text-xs text-gray-400">{participantCount}명 참여 중</p>
        )}
      </div>
    </Link>
  )
}
