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
import {
  parseBlocks,
  linkDisplayLabel,
  linkHref,
  linkKindOf,
  linkKindEmoji,
  parseYouTubeId,
} from '@/lib/domain/option-content'
import { YouTubeEmbed } from '@/components/youtube-embed'
import type { Option } from '@/lib/api/options'

interface OptionDetailClientProps {
  option: Option
  boxId: string
  round: number
  canVote: boolean
  currentUserId: string
}

export function OptionDetailClient({
  option,
  boxId,
  round,
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
  const blocks = parseBlocks(option.content)
  // 라벨 칩은 링크가 2개 이상(구분 필요)일 때만. 하나뿐이면 선택지 이름이 곧 식별자라 중복.
  const multiLink = blocks.filter(b => b.type === 'link').length > 1

  // 참여자면 누구나 편집·삭제 (008 RLS: 방장·작성자 구분 폐기). 페이지가 비참여자를 이미 리다이렉트.
  const canEdit = true
  const canDelete = true

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

        {/* 본문 (블록: 글·사진·라벨링크 순서대로) */}
        {blocks.length > 0 && (
          <div className="space-y-3 rounded-card border border-[#ECEADC] bg-paper p-5">
            {blocks.map(block => {
              if (block.type === 'text') {
                return (
                  <p key={block.id} className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">
                    {block.text}
                  </p>
                )
              }
              if (block.type === 'image') {
                return (
                  <a key={block.id} href={linkHref(block.url)} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.url}
                      alt="첨부 사진"
                      className="max-h-80 w-full rounded-[14px] border border-line object-cover"
                    />
                  </a>
                )
              }
              // link — 유튜브면 인라인 플레이어, 아니면 미리보기 카드
              const ytId = parseYouTubeId(block.url)
              if (ytId) {
                return (
                  <div key={block.id} className="space-y-1.5">
                    {multiLink && block.label && (
                      <span className="inline-block rounded-full bg-butter-tint px-1.5 py-0.5 text-[10.5px] font-bold text-ink">
                        {block.label}
                      </span>
                    )}
                    <YouTubeEmbed videoId={ytId} />
                  </div>
                )
              }
              const emoji = linkKindEmoji(linkKindOf(block))
              return (
                <a
                  key={block.id}
                  href={linkHref(block.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 rounded-[14px] border border-line bg-cream/40 p-3 active:bg-cream"
                >
                  <div className="relative h-14 w-14 shrink-0">
                    {block.image ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={block.image} alt="" className="h-14 w-14 rounded-[10px] border border-line object-cover" />
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-paper text-[11px]">
                          {emoji}
                        </span>
                      </>
                    ) : (
                      <span className="flex h-14 w-14 items-center justify-center rounded-[10px] border border-line bg-paper text-2xl">
                        {emoji}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {multiLink && block.label && (
                      <span className="inline-block rounded-full bg-butter-tint px-1.5 py-0.5 text-[10.5px] font-bold text-ink">
                        {block.label}
                      </span>
                    )}
                    <p className="mt-0.5 truncate text-[13px] font-bold text-ink">
                      {block.title || linkDisplayLabel(block.label, block.url)}
                    </p>
                    {block.description && (
                      <p className="line-clamp-1 text-[11.5px] text-ink-soft">{block.description}</p>
                    )}
                    <p className="truncate text-[11px] text-ink-faint">{block.url}</p>
                  </div>
                </a>
              )
            })}
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
              className="min-w-0 flex-1 rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
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
