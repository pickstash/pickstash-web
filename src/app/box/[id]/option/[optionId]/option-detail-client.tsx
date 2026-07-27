'use client'

import Link from 'next/link'
import { useState } from 'react'
import { VoteButtons } from '@/components/vote-buttons'
import { PageHeader } from '@/components/page-header'
import { AppDrawer } from '@/components/app-drawer'
import { Icon } from '@/components/icon'
import { CommentComposer } from '@/components/comment-composer'
import { useBoxVotes } from '@/hooks/use-votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { useDeleteOption } from '@/hooks/use-options'
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/use-comments'
import { useRealtimeComments } from '@/hooks/use-realtime-comments'
import { useCommentLikes, useToggleCommentLike } from '@/hooks/use-comment-likes'
import { useRealtimeCommentLikes } from '@/hooks/use-realtime-comment-likes'
import {
  parseBlocks,
  linkFallbackTitle,
  linkHref,
  linkKindOf,
  linkKindEmoji,
  parseYouTubeId,
} from '@/lib/domain/option-content'
import { groupComments } from '@/lib/domain/comments'
import { parseMentionBody } from '@/lib/domain/mentions'
import { formatKoreanDate, formatRelativeTime } from '@/lib/utils'
import { proxiedImageUrl } from '@/lib/api/unfurl'
import { YouTubeEmbed } from '@/components/youtube-embed'
import type { Option } from '@/lib/api/options'
import type { CommentWithProfile } from '@/lib/api/comments'

type Creator = { nickname: string; avatar_url: string | null } | null
type Participant = { id: string; nickname: string; avatar_url: string | null }

interface OptionDetailClientProps {
  option: Option
  creator: Creator
  boxId: string
  round: number
  canVote: boolean
  currentUserId: string
  myNickname: string
  participants: Participant[]
}

export function OptionDetailClient({
  option,
  creator,
  boxId,
  round,
  canVote,
  currentUserId,
  myNickname,
  participants,
}: OptionDetailClientProps) {
  const { data: votes = {} } = useBoxVotes(boxId, round)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const deleteOption = useDeleteOption(boxId)
  const { data: comments = [] } = useComments(option.id)
  const createComment = useCreateComment(option.id)
  const updateComment = useUpdateComment(option.id)
  const deleteComment = useDeleteComment(option.id)
  const { data: commentLikes = {} } = useCommentLikes(option.id)
  const toggleCommentLike = useToggleCommentLike(option.id)

  useRealtimeVotes(boxId, round)
  useRealtimeComments(option.id)
  useRealtimeCommentLikes(option.id)

  const counts = votes[option.id] ?? { like: 0, dislike: 0, myVote: null }
  const blocks = parseBlocks(option.content)
  const { top: topComments, repliesByParent } = groupComments(comments)

  function renderCommentBody(body: string) {
    return parseMentionBody(body).map((seg, i) =>
      seg.type === 'mention' ? (
        <span key={i} className="font-bold text-butter-dark">@{seg.nickname}</span>
      ) : (
        <span key={i}>{seg.value}</span>
      )
    )
  }

  function commentActionRow(comment: CommentWithProfile, topLevelId: string) {
    const like = commentLikes[comment.id] ?? { count: 0, likedByMe: false }
    return (
      <div className="mt-1 flex items-center gap-3">
        <button
          onClick={() => toggleCommentLike.mutate({ commentId: comment.id, likedByMe: like.likedByMe })}
          className={`flex items-center gap-1 text-[11px] font-bold ${like.likedByMe ? 'text-butter-dark' : 'text-ink-faint'}`}
        >
          <Icon name="heart" filled={like.likedByMe} size={12} />
          {like.count > 0 && <span className="tabular-nums">{like.count}</span>}
        </button>
        <button
          onClick={() => { setReplyingTo(topLevelId); setEditingId(null) }}
          className="text-[11px] font-bold text-ink-faint"
        >
          답글
        </button>
        {comment.user_id === currentUserId && (
          <>
            <button
              onClick={() => { setEditingId(comment.id); setReplyingTo(null) }}
              className="text-[11px] text-ink-faint"
            >
              수정
            </button>
            <button
              onClick={() => deleteComment.mutate(comment.id)}
              className="text-[11px] text-ink-faint"
            >
              삭제
            </button>
          </>
        )}
      </div>
    )
  }

  function renderComment(comment: CommentWithProfile, topLevelId: string, small?: boolean) {
    if (editingId === comment.id) {
      return (
        <CommentComposer
          key={comment.id}
          participants={participants}
          currentUserId={currentUserId}
          initialBody={comment.body}
          submitLabel="저장"
          autoFocus
          isPending={updateComment.isPending}
          onCancel={() => setEditingId(null)}
          onSubmit={body => updateComment.mutate({ id: comment.id, body }, { onSuccess: () => setEditingId(null) })}
        />
      )
    }
    return (
      <div key={comment.id} className="flex gap-3">
        <div className={`shrink-0 overflow-hidden rounded-full bg-butter-tint ${small ? 'h-6 w-6' : 'h-7 w-7'}`}>
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
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-ink">{comment.profiles?.nickname}</span>
            <span className="text-[11px] text-ink-faint">
              {formatRelativeTime(comment.created_at)}
              {comment.edited_at && ' · 수정됨'}
            </span>
          </div>
          <p className="mt-0.5 break-words text-[13.5px] text-ink">{renderCommentBody(comment.body)}</p>
          {commentActionRow(comment, topLevelId)}
        </div>
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col">
      {/* 헤더: 뒤로가기 + 햄버거 메뉴. 선택지 이름·액션은 아래 히어로로 이전 */}
      <PageHeader fallbackHref={`/box/${boxId}`} right={<AppDrawer nickname={myNickname} />} />

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="text-[15px] font-extrabold text-ink">선택지를 삭제할까요?</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              이 선택지의 투표·댓글이 모두 사라져요. 되돌릴 수 없어요.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={() => deleteOption.mutate(option.id)}
                disabled={deleteOption.isPending}
                className="flex-1 rounded-field bg-tomato py-3 text-[13px] font-bold text-white disabled:opacity-50"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 px-5 pb-10 pt-1">
        {/* 히어로: 제목 · 생성자 · 생성일 · 좋아요 (정보성 데이터 상단 집중) */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="min-w-0 text-[22px] font-extrabold leading-tight tracking-tight text-ink">
              {option.name}
            </h1>
            {/* 편집 메뉴 — 참여자 누구나 (008 RLS). 수정·삭제를 한 곳에. */}
            <div className="relative shrink-0">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="mt-1 flex items-center gap-1 text-[12.5px] font-semibold text-ink-faint active:text-ink"
              >
                <Icon name="edit" size={13} />
                편집
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-32 overflow-hidden rounded-[14px] border border-line bg-paper py-1 shadow-[0_8px_24px_rgba(42,42,39,0.16)]">
                    <Link
                      href={`/box/${boxId}/option/${option.id}/edit`}
                      className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                    >
                      선택지 수정
                    </Link>
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                      className="block w-full border-t border-line px-4 py-2.5 text-left text-[13px] font-semibold text-tomato active:bg-tomato-tint"
                    >
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 생성자 · 생성일 */}
          <div className="flex items-center gap-2 text-[12px]">
            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-butter-tint">
              {creator?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={creator.avatar_url} alt={creator.nickname} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-ink">
                  {creator?.nickname?.[0] ?? '?'}
                </div>
              )}
            </div>
            <span className="font-bold text-ink-soft">{creator?.nickname ?? '알 수 없음'}</span>
            <span className="text-ink-faint">· {formatKoreanDate(option.created_at)}</span>
          </div>

          {/* 좋아요(투표) */}
          <div className="flex items-center gap-2">
            <VoteButtons optionId={option.id} boxId={boxId} round={round} counts={counts} disabled={!canVote} />
            {!canVote && <span className="text-[11.5px] text-ink-faint">정리된 상자에선 투표할 수 없어요</span>}
          </div>
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
                      className="h-auto w-full rounded-[14px] border border-line"
                    />
                  </a>
                )
              }
              // link — 유튜브면 인라인 플레이어, 아니면 미리보기 카드
              const ytId = parseYouTubeId(block.url)
              if (ytId) {
                return (
                  <div key={block.id} className="space-y-1.5">
                    <YouTubeEmbed videoId={ytId} />
                    {block.label && (
                      <p className="border-t border-dashed border-line pt-2 text-[13px] text-ink-soft">
                        📝 {block.label}
                      </p>
                    )}
                  </div>
                )
              }
              const emoji = linkKindEmoji(linkKindOf(block))
              return (
                <div key={block.id} className="rounded-[14px] border border-line bg-cream/40 p-3">
                  <a href={linkHref(block.url)} target="_blank" rel="noopener noreferrer" className="flex gap-3 active:opacity-80">
                    <div className="relative h-14 w-14 shrink-0">
                      {block.image ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={proxiedImageUrl(block.image)} alt="" className="h-14 w-14 rounded-[10px] border border-line object-cover" />
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
                      <p className="mt-0.5 truncate text-[13px] font-bold text-ink">
                        {block.title || linkFallbackTitle(block.url)}
                      </p>
                      {block.description && (
                        <p className="line-clamp-1 text-[11.5px] text-ink-soft">{block.description}</p>
                      )}
                      <p className="truncate text-[11px] text-ink-faint">{block.url}</p>
                    </div>
                  </a>
                  {block.label && (
                    <p className="mt-2 border-t border-dashed border-line pt-2 text-[13px] text-ink-soft">
                      📝 {block.label}
                    </p>
                  )}
                </div>
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
            {topComments.map(comment => {
              const replies = repliesByParent[comment.id] ?? []
              return (
                <div key={comment.id} className="space-y-3">
                  {renderComment(comment, comment.id)}
                  {replies.length > 0 && (
                    <div className="ml-9 space-y-3 border-l-2 border-cream pl-3">
                      {replies.map(reply => renderComment(reply, comment.id, true))}
                    </div>
                  )}
                  {replyingTo === comment.id && (
                    <div className="ml-9">
                      <CommentComposer
                        participants={participants}
                        currentUserId={currentUserId}
                        placeholder={`${comment.profiles?.nickname ?? ''}님에게 답글`}
                        initialMention={
                          comment.profiles ? { id: comment.user_id, nickname: comment.profiles.nickname } : undefined
                        }
                        submitLabel="등록"
                        autoFocus
                        isPending={createComment.isPending}
                        onCancel={() => setReplyingTo(null)}
                        onSubmit={body =>
                          createComment.mutate(
                            { body, parentCommentId: comment.id },
                            { onSuccess: () => setReplyingTo(null) },
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <CommentComposer
            participants={participants}
            currentUserId={currentUserId}
            placeholder="댓글을 입력하세요"
            submitLabel="등록"
            isPending={createComment.isPending}
            compact
            onSubmit={body => createComment.mutate({ body })}
          />
        </div>
      </div>
    </main>
  )
}
