'use client'

import { createPortal } from 'react-dom'
import { Icon } from '@/components/icon'
import type { Liker } from '@/lib/api/likers'

// 좋아요 누른 사람 명단 바텀시트 — 선택지·댓글 좋아요 '꾸욱' 롱프레스로 연다.
// 아바타+닉네임 행(히어로 참여자 스타일과 통일). deadline-bottom-sheet와 동일 시트 골격.
// 이 시트는 옵션 목록 깊숙이(VoteButtons·댓글 버튼)서 렌더돼 조상 stacking context에 갇힌다
// (딤이 헤더/하단바 뒤로 깔림) → document.body로 포탈해 앱 크롬 위(z-[80])에 확실히 띄운다.
export function LikersSheet({
  open,
  title,
  likers,
  isLoading,
  onClose,
}: {
  open: boolean
  title: string
  likers: Liker[]
  isLoading: boolean
  onClose: () => void
}) {
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-base font-extrabold tracking-tight text-ink">
            <Icon name="heart" filled size={16} className="text-butter-dark" />
            {title}
            {likers.length > 0 && <span className="text-ink-faint tabular-nums">{likers.length}</span>}
          </h3>
          <button onClick={onClose} className="text-[13px] text-ink-faint">닫기</button>
        </div>

        <div className="max-h-[50dvh] min-h-[180px] overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-[13px] text-ink-faint">불러오는 중…</p>
          ) : likers.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-ink-faint">아직 좋아요한 사람이 없어요.</p>
          ) : (
            <ul>
              {likers.map(l => (
                <li key={l.user_id} className="flex items-center gap-2.5 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream text-[13px] font-bold text-ink">
                    {l.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      l.nickname[0] ?? '?'
                    )}
                  </span>
                  <span className="min-w-0 truncate text-[14px] font-bold text-ink">{l.nickname}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
