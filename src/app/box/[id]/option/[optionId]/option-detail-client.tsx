'use client'

import { AppLink } from '@/lib/nav/nav'
import { useState } from 'react'
import { VoteButtons } from '@/components/vote-buttons'
import { PageHeader } from '@/components/page-header'
import { AppDrawer } from '@/components/app-drawer'
import { Icon } from '@/components/icon'
import { CommentComposer } from '@/components/comment-composer'
import { useBoxVotes } from '@/hooks/use-votes'
import { useRealtimeVotes } from '@/hooks/use-realtime-votes'
import { useOption, useDeleteOption, useUpdateOption, useToggleOptionChecked } from '@/hooks/use-options'
import { RichText } from '@/components/rich-text'
import { useComments, useCreateComment, useUpdateComment, useDeleteComment } from '@/hooks/use-comments'
import { useRealtimeComments } from '@/hooks/use-realtime-comments'
import { useCommentLikes, useToggleCommentLike } from '@/hooks/use-comment-likes'
import { useRealtimeCommentLikes } from '@/hooks/use-realtime-comment-likes'
import { useCommentLikers } from '@/hooks/use-likers'
import { CommentLikeButton } from '@/components/comment-like-button'
import { LikersSheet } from '@/components/likers-sheet'
import { ImageLightbox } from '@/components/image-lightbox'
import {
  parseBlocks,
  linkFallbackTitle,
  linkHref,
  linkKindOf,
  linkKindEmoji,
  parseYouTubeId,
  toggleCheckedAtIndex,
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
  /** 모아보기 상자(§033) — 좋아요 대신 그룹 라벨을 보여준다. */
  checklist?: boolean
  /** 모아보기 중 '항목 체크 사용'(044) — true일 때만 체크박스를 그린다. 기본 false */
  checkable?: boolean
  currentUserId: string
  myNickname: string
  participants: Participant[]
  /** 048: 서랍 접근으로 읽기 전용 조회 중이면 false — 편집·댓글 작성 등 쓰기 UI를 숨긴다. */
  isParticipant: boolean
}

export function OptionDetailClient({
  option: initialOption,
  creator,
  boxId,
  round,
  canVote,
  checklist = false,
  checkable = false,
  currentUserId,
  myNickname,
  participants,
  isParticipant,
}: OptionDetailClientProps) {
  // 서버에서 받은 초기값으로 시작하되, 수정 직후 이동해와도 최신 이름·본문이 보이도록 라이브 쿼리로 덮어쓴다.
  const { data: fetchedOption } = useOption(initialOption.id)
  const option = fetchedOption ?? initialOption
  const { data: votes = {} } = useBoxVotes(boxId, round)
  const toggleChecked = useToggleOptionChecked(boxId)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<{ parentId: string; mention?: { id: string; nickname: string } } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteComment, setConfirmDeleteComment] = useState<string | null>(null)
  // 등록 성공 시 key를 올려 새 댓글 컴포저를 리마운트(입력 내용 비우기 → 중복 등록 방지)
  const [composerKey, setComposerKey] = useState(0)
  const deleteOption = useDeleteOption(boxId)
  const updateOption = useUpdateOption(option.id, boxId)
  const { data: comments = [] } = useComments(option.id)
  const createComment = useCreateComment(option.id)
  const updateComment = useUpdateComment(option.id)
  const deleteComment = useDeleteComment(option.id)
  const { data: commentLikes = {} } = useCommentLikes(option.id)
  const toggleCommentLike = useToggleCommentLike(option.id)
  // 꾸욱(롱프레스) → 이 댓글을 좋아한 사람 명단 시트
  const [likersComment, setLikersComment] = useState<string | null>(null)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const commentLikers = useCommentLikers(likersComment, !!likersComment)

  useRealtimeVotes(boxId, round)
  useRealtimeComments(option.id)
  useRealtimeCommentLikes(option.id)

  const counts = votes[option.id] ?? { like: 0, dislike: 0, myVote: null }
  const blocks = parseBlocks(option.content)

  // 본문 체크박스 클릭 → 즉시 저장(참여자 누구나 편집 가능, §3-4에 따라 정리완료여도 허용)
  function toggleCheck(blockId: string, checkIndex: number) {
    const next = blocks.map(b => (b.id === blockId && b.type === 'text' ? { ...b, text: toggleCheckedAtIndex(b.text, checkIndex) } : b))
    updateOption.mutate({ content: next })
  }
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
        <CommentLikeButton
          count={like.count}
          likedByMe={like.likedByMe}
          onToggle={isParticipant ? () => toggleCommentLike.mutate({ commentId: comment.id, likedByMe: like.likedByMe }) : undefined}
          onShowLikers={() => setLikersComment(comment.id)}
        />
        {isParticipant && (
          <button
            onClick={() => {
              setReplyingTo({
                parentId: topLevelId,
                mention: comment.profiles
                  ? { id: comment.user_id, nickname: comment.profiles.nickname }
                  : undefined,
              })
              setEditingId(null)
            }}
            className="text-[11px] font-bold text-ink-faint"
          >
            답글
          </button>
        )}
        {isParticipant && comment.user_id === currentUserId && (
          <>
            <button
              onClick={() => { setEditingId(comment.id); setReplyingTo(null) }}
              className="text-[11px] text-ink-faint"
            >
              수정
            </button>
            <button
              onClick={() => setConfirmDeleteComment(comment.id)}
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

      {/* 댓글 삭제 확인 — 답글까지 함께 사라지므로 실수 방지 */}
      {confirmDeleteComment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setConfirmDeleteComment(null)} />
          <div className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="text-[15px] font-extrabold text-ink">댓글을 삭제할까요?</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              답글이 달려 있으면 함께 사라져요. 되돌릴 수 없어요.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDeleteComment(null)}
                className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={() => {
                  deleteComment.mutate(confirmDeleteComment)
                  setConfirmDeleteComment(null)
                }}
                disabled={deleteComment.isPending}
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
          {checklist && option.group_label && (
            <span className="inline-flex w-fit items-center rounded-full border border-line bg-cream px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
              {option.group_label}
            </span>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              {checklist && checkable && (
                <button
                  type="button"
                  disabled={!isParticipant}
                  onClick={() => toggleChecked.mutate({ optionId: option.id, checked: !option.checked_at })}
                  aria-pressed={!!option.checked_at}
                  aria-label={option.checked_at ? '체크 해제' : '체크'}
                  className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border-[1.5px] ${
                    option.checked_at ? 'border-ink bg-ink text-cream' : 'border-line bg-paper'
                  }`}
                >
                  {option.checked_at && <Icon name="check" size={14} strokeWidth={3} />}
                </button>
              )}
              <h1 className={`min-w-0 text-[22px] font-extrabold leading-tight tracking-tight ${checkable && option.checked_at ? 'text-ink-faint line-through' : 'text-ink'}`}>
                {option.name}
              </h1>
            </div>
            {/* 편집 메뉴 — 참여자만 (008 RLS). 수정·삭제를 한 곳에. */}
            {isParticipant && <div className="relative shrink-0">
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
                    <AppLink
                      href={`/box/${boxId}/option/${option.id}/edit`}
                      className="block w-full px-4 py-2.5 text-left text-[13px] font-semibold text-ink active:bg-cream"
                    >
                      {checklist ? '항목 수정' : '선택지 수정'}
                    </AppLink>
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                      className="block w-full border-t border-line px-4 py-2.5 text-left text-[13px] font-semibold text-tomato active:bg-tomato-tint"
                    >
                      삭제
                    </button>
                  </div>
                </>
              )}
            </div>}
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

          {/* 좋아요(투표) — 체크형 상자는 투표 개념이 없어 생략 */}
          {!checklist && (
            <div className="flex items-center gap-2">
              <VoteButtons optionId={option.id} boxId={boxId} round={round} counts={counts} disabled={!canVote} />
              {!canVote && <span className="text-[11.5px] text-ink-faint">정리된 상자에선 투표할 수 없어요</span>}
            </div>
          )}
        </div>

        {/* 본문 (블록: 글·사진·라벨링크 순서대로) */}
        {blocks.length > 0 && (
          <div className="space-y-3 rounded-card border border-[#ECEADC] bg-paper p-5">
            {blocks.map(block => {
              if (block.type === 'text') {
                return (
                  <RichText
                    key={block.id}
                    text={block.text}
                    className="space-y-1.5 text-[13.5px] leading-relaxed text-ink"
                    onToggleCheck={isParticipant ? lineIndex => toggleCheck(block.id, lineIndex) : undefined}
                  />
                )
              }
              if (block.type === 'image') {
                return (
                  <button key={block.id} type="button" onClick={() => setLightboxSrc(block.url)} className="block w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.url}
                      alt="첨부 사진"
                      className="h-auto w-full rounded-[14px] border border-line"
                    />
                  </button>
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
                  {replyingTo?.parentId === comment.id && (
                    <div className="ml-9">
                      <CommentComposer
                        participants={participants}
                        currentUserId={currentUserId}
                        placeholder={`${replyingTo.mention?.nickname ?? ''}님에게 답글`}
                        initialMention={replyingTo.mention}
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

          {isParticipant ? (
            <CommentComposer
              key={composerKey}
              participants={participants}
              currentUserId={currentUserId}
              placeholder="댓글을 입력하세요"
              submitLabel="등록"
              isPending={createComment.isPending}
              compact
              onSubmit={body => createComment.mutate({ body }, { onSuccess: () => setComposerKey(k => k + 1) })}
            />
          ) : (
            <p className="text-center text-[12px] text-ink-faint">함께하기를 누르면 댓글을 남길 수 있어요</p>
          )}
        </div>
      </div>

      <LikersSheet
        open={!!likersComment}
        title="이 댓글을 좋아해요"
        likers={commentLikers.data ?? []}
        isLoading={commentLikers.isLoading}
        onClose={() => setLikersComment(null)}
      />

      <ImageLightbox open={!!lightboxSrc} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </main>
  )
}
