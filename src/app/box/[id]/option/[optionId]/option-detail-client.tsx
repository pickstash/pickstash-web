'use client'

import Link from 'next/link'
import { useState } from 'react'
import { VoteButtons } from '@/components/vote-buttons'
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
  currentUserId: string
}

export function OptionDetailClient({
  option,
  boxId,
  round,
  isOwner,
  isAuthor,
  canVote,
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
    ? (option.summary as { text: string; order: number }[]).sort((a, b) => a.order - b.order)
    : []
  const links = Array.isArray(option.links) ? (option.links as string[]) : []

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim()) return
    createComment.mutate(commentBody.trim(), {
      onSuccess: () => setCommentBody(''),
    })
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href={`/box/${boxId}`} className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">{option.name}</h1>
        {(isOwner || isAuthor) && (
          <Link href={`/box/${boxId}/option/${option.id}/edit`} className="text-xs text-blue-500 shrink-0">
            수정
          </Link>
        )}
      </header>

      <div className="flex-1 px-5 py-5 space-y-4">
        {/* 투표 */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">투표</h2>
          <VoteButtons optionId={option.id} boxId={boxId} round={round} counts={counts} disabled={!canVote} />
          {!canVote && <p className="text-xs text-gray-400">마감된 상자에서는 투표할 수 없어요.</p>}
        </div>

        {/* 요약 항목 */}
        {summary.length > 0 && (
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">요약</h2>
            <ul className="space-y-1.5">
              {summary.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-gray-300 shrink-0">•</span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 메모 */}
        {option.memo && (
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">메모</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{option.memo}</p>
          </div>
        )}

        {/* 링크 */}
        {links.length > 0 && (
          <div className="bg-white rounded-2xl p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gray-900">링크</h2>
            <ul className="space-y-2">
              {links.map((link, i) => (
                <li key={i}>
                  <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 break-all underline">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 댓글 */}
        <div className="bg-white rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">댓글 {comments.length > 0 ? comments.length : ''}</h2>

          {comments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">아직 댓글이 없어요.</p>
          )}

          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  {comment.profiles?.avatar_url ? (
                    <img src={comment.profiles.avatar_url} alt={comment.profiles.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                      {comment.profiles?.nickname?.[0] ?? '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-700">{comment.profiles?.nickname}</span>
                    {comment.user_id === currentUserId && (
                      <button
                        onClick={() => deleteComment.mutate(comment.id)}
                        className="text-xs text-gray-300 shrink-0"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 break-words">{comment.body}</p>
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
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
            />
            <button
              type="submit"
              disabled={!commentBody.trim() || createComment.isPending}
              className="shrink-0 bg-gray-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
            >
              등록
            </button>
          </form>
        </div>
      </div>

      {/* 삭제 (방장 또는 작성자) */}
      {(isOwner || isAuthor) && (
        <div className="px-5 pb-10">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="w-full border border-red-200 text-red-400 py-3.5 rounded-xl text-sm font-medium">
              선택지 삭제
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-sm text-gray-500">정말 삭제하시겠어요?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-medium">
                  취소
                </button>
                <button
                  onClick={() => deleteOption.mutate(option.id)}
                  disabled={deleteOption.isPending}
                  className="flex-1 bg-red-500 text-white py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
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
