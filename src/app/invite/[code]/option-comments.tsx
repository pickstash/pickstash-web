'use client'

import { useState } from 'react'
import { Icon } from '@/components/icon'
import { groupComments } from '@/lib/domain/comments'
import { parseMentionBody } from '@/lib/domain/mentions'
import { formatRelativeTime } from '@/lib/utils'
import type { BoxViewerComment } from '@/lib/api/invites'

/**
 * 초대 뷰어의 선택지별 댓글 — 기본 접힘, '댓글 N개 보기' 탭 시 펼침(토글).
 * 읽기 전용 뷰어가 서버 컴포넌트라 토글(useState)만 이 클라이언트 조각으로 분리한다.
 */
export function OptionComments({ comments }: { comments: BoxViewerComment[] }) {
  const [open, setOpen] = useState(false)
  if (comments.length === 0) return null

  return (
    <div className="border-t border-dashed border-line pt-3">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-[12px] font-bold text-ink-faint active:opacity-70"
      >
        {open ? '댓글 접기' : `댓글 ${comments.length}개 보기`}
      </button>
      {open && <div className="mt-3">{renderComments(comments)}</div>}
    </div>
  )
}

/** 선택지 상세 페이지용 — 접힘 없이 항상 펼친 댓글 전체(049). */
export function OptionCommentsExpanded({ comments }: { comments: BoxViewerComment[] }) {
  if (comments.length === 0) {
    return <p className="py-2 text-center text-[13px] text-ink-faint">아직 댓글이 없어요.</p>
  }
  return renderComments(comments)
}

/** 멘션 토큰을 강조 렌더 */
function renderCommentBody(body: string) {
  return parseMentionBody(body).map((seg, i) =>
    seg.type === 'mention' ? (
      <span key={i} className="font-bold text-butter-dark">
        @{seg.nickname}
      </span>
    ) : (
      <span key={i}>{seg.value}</span>
    ),
  )
}

/** 댓글(플랫 2단계)을 읽기 전용으로 렌더 — 답글 들여쓰기·좋아요 수·수정됨 표시. */
function renderComments(comments: BoxViewerComment[]) {
  const { top, repliesByParent } = groupComments(comments)
  return (
    <div className="space-y-3">
      {top.map(comment => {
        const replies = repliesByParent[comment.id] ?? []
        return (
          <div key={comment.id} className="space-y-2">
            {renderOneComment(comment)}
            {replies.length > 0 && (
              <div className="ml-8 space-y-2 border-l-2 border-cream pl-3">
                {replies.map(reply => renderOneComment(reply, true))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function renderOneComment(comment: BoxViewerComment, small?: boolean) {
  return (
    <div key={comment.id} className="flex gap-2.5">
      <div className={`shrink-0 overflow-hidden rounded-full bg-butter-tint ${small ? 'h-6 w-6' : 'h-7 w-7'}`}>
        {comment.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={comment.avatar_url} alt={comment.nickname} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-ink">
            {comment.nickname?.[0] ?? '?'}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-ink">{comment.nickname}</span>
          <span className="text-[11px] text-ink-faint">
            {formatRelativeTime(comment.created_at)}
            {comment.edited_at && ' · 수정됨'}
          </span>
        </div>
        <p className="mt-0.5 break-words text-[13.5px] text-ink">{renderCommentBody(comment.body)}</p>
        {comment.like_count > 0 && (
          <span className="mt-1 flex items-center gap-1 text-[11px] font-bold text-ink-faint">
            <Icon name="heart" size={12} />
            <span className="tabular-nums">{comment.like_count}</span>
          </span>
        )}
      </div>
    </div>
  )
}
