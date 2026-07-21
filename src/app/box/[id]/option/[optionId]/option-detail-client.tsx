'use client'

import Link from 'next/link'
import { useState } from 'react'
import { VoteButtons } from '@/components/vote-buttons'
import { PageHeader } from '@/components/page-header'
import { useBoxVotes } from '@/hooks/use-votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { useDeleteOption } from '@/hooks/use-options'
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/use-comments'
import { useRealtimeComments } from '@/hooks/use-realtime-comments'
import type { Option } from '@/lib/api/options'

interface OptionDetailClientProps {
  option: Option
  boxId: string
  round: number
  isOwner: boolean
  isAuthor: boolean
  canVote: boolean
  isDone: boolean
  currentUserId: string
}

export function OptionDetailClient({
  option,
  boxId,
  round,
  isOwner,
  isAuthor,
  canVote,
  isDone,
  currentUserId,
}: OptionDetailClientProps) {
  const { data: votes = {} } = useBoxVotes(boxId, round)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const deleteOption = useDeleteOption(boxId)
  const { data: comments = [] } = useComments(option.id)
  const createComment = useCreateComment(option.id)
  const deleteComment = useDeleteComment(option.id)

  useRealtimeVotes(boxId, round)
  useRealtimeComments(option.id)

  const counts = votes[option.id] ?? { like: 0, dislike: 0, myVote: null }
  const summary = Array.isArray(option.summary)
    ? [...(option.summary as { text: string; order: number }[])].sort((a, b) => a.order - b.order)
    : []
  const links = Array.isArray(option.links) ? (option.links as string[]) : []

  // 정리된 상자에서는 편집·삭제 불가 (spec 3장 · 004 RLS 병행)
  const canEdit = !isDone && (isOwner || isAuthor)
  const canDelete = !isDone && isAuthor

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim()) return
    createComment.mutate(commentBody.trim(), {
      onSuccess: () => setCommentBody(''),
    })
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader
        title={option.name}
        fallbackHref={`/box/${boxId}`}
        right={
          canEdit ? (
            <Link
              href={`/box/${boxId}/option/${option.id}/edit`}
              className="shrink-0 text-[13px] font-semibold text-ink-soft"
            >
              수정
            </Link>
          ) : undefined
        }
      />

      <div className="flex-1 space-y-3 px-5 pb-5 pt-1">
        {/* 투표 */}
        <div className="space-y-3 rounded-card border border-[#ECEADC] bg-paper p-5">
          <h2 className="text-[13.5px] font-extrabold text-ink">투표</h2>
          <VoteButtons optionId={option.id} boxId={boxId} round={round} counts={counts} disabled={!canVote} />
          {!canVote && <p className="text-xs text-ink-faint">정리된 상자에서는 투표할 수 없어요.</p>}
        </div>

        {/* 요약 */}
        {summary.length > 0 && (
          <div className="space-y-2 rounded-card border border-[#ECEADC] bg-paper p-5">
            <h2 className="text-[13.5px] font-extrabold text-ink">요약</h2>
            <ul className="space-y-1.5">
              {summary.map((item, i) => (
                <li key={i} className="flex gap-2 text-[13.5px] text-ink">
                  <span className="shrink-0 text-[#DBD8C6]">—</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 메모 */}
        {option.memo && (
          <div className="space-y-2 rounded-card border border-[#ECEADC] bg-paper p-5">
            <h2 className="text-[13.5px] font-extrabold text-ink">메모</h2>
            <p className="whitespace-pre-wrap text-[13.5px] text-ink">{option.memo}</p>
          </div>
        )}

        {/* 링크 */}
        {links.length > 0 && (
          <div className="space-y-2 rounded-card border border-[#ECEADC] bg-paper p-5">
            <h2 className="text-[13.5px] font-extrabold text-ink">링크</h2>
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li key={i}>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="break-all text-[13px] text-ink underline decoration-butter-dark underline-offset-2">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 댓글 */}
        <div className="space-y-4 rounded-card border border-[#ECEADC] bg-paper p-5">
          <h2 className="text-[13.5px] font-extrabold text-ink">
            댓글 {comments.length > 0 ? comments.length : ''}
          </h2>

          {comments.length === 0 && (
            <p className="py-2 text-center text-[13px] text-ink-faint">아직 댓글이 없어요.</p>
          )}

          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-butter-tint">
                  {comment.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={comment.profiles.avatar_url} alt={comment.profiles.nickname} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-ink">
                      {comment.profiles?.nickname?.[0] ?? '?'}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink">{comment.profiles?.nickname}</span>
                    {comment.user_id === currentUserId && (
                      <button
                        onClick={() => deleteComment.mutate(comment.id)}
                        className="shrink-0 text-[11px] text-ink-faint"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 break-words text-[13.5px] text-ink">{comment.body}</p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <input
              type="text"
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              placeholder="댓글을 입력하세요"
              maxLength={200}
              className="flex-1 rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
            />
            <button
              type="submit"
              disabled={!commentBody.trim() || createComment.isPending}
              className="shrink-0 rounded-field bg-ink px-4 py-2.5 text-sm font-bold text-cream disabled:opacity-50"
            >
              등록
            </button>
          </form>
        </div>
      </div>

      {/* 삭제 (작성자만, 진행 중 상자만) */}
      {canDelete && (
        <div className="px-5 pb-10">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full rounded-field border border-tomato/40 py-3.5 text-sm font-semibold text-tomato active:bg-tomato-tint"
            >
              선택지 삭제
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-[13px] text-ink-soft">정말 삭제하시겠어요?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-field border border-line py-3.5 text-sm font-bold text-ink-soft"
                >
                  취소
                </button>
                <button
                  onClick={() => deleteOption.mutate(option.id)}
                  disabled={deleteOption.isPending}
                  className="flex-1 rounded-field bg-tomato py-3.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  삭제하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
