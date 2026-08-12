'use client'

import { Icon } from '@/components/icon'
import { useLongPress } from '@/lib/use-long-press'

// 댓글 좋아요 버튼 — 탭=토글, 꾸욱(롱프레스)=누가 좋아요 했는지 명단.
// commentActionRow(맵 안 렌더 함수)에서 훅을 직접 못 쓰므로 컴포넌트로 분리(훅 규칙).
export function CommentLikeButton({
  count,
  likedByMe,
  onToggle,
  onShowLikers,
}: {
  count: number
  likedByMe: boolean
  /** 없으면(읽기 전용) 탭해도 토글되지 않고 롱프레스로 좋아요 명단만 볼 수 있다. */
  onToggle?: () => void
  onShowLikers: () => void
}) {
  const lp = useLongPress(() => {
    if (count > 0) onShowLikers()
  })

  return (
    <button
      onClick={() => {
        if (lp.suppressClick()) return
        onToggle?.()
      }}
      {...lp.handlers}
      className={`flex select-none items-center gap-1 text-[11px] font-bold ${likedByMe ? 'text-butter-dark' : 'text-ink-faint'}`}
    >
      <Icon name="heart" filled={likedByMe} size={12} />
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  )
}
