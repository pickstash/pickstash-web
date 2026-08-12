import Image from 'next/image'
import { Icon } from '@/components/icon'
import { YouTubeEmbed } from '@/components/youtube-embed'
import { RichText } from '@/components/rich-text'
import {
  parseBlocks,
  linkFallbackTitle,
  linkHref,
  linkKindOf,
  linkKindEmoji,
  parseYouTubeId,
} from '@/lib/domain/option-content'
import { proxiedImageUrl } from '@/lib/api/unfurl'
import { formatKoreanDate } from '@/lib/utils'
import type { BoxViewerData, BoxViewerOption, BoxViewerParticipant } from '@/lib/api/invites'
import { OptionCommentsExpanded } from '../../option-comments'

/**
 * 초대 뷰어의 선택지 상세(049) — 참여자 화면(option-detail-client)과 같은 레이아웃으로 본문 전체 +
 * 댓글 전체를 상시 노출한다(접힘 없음). 서버 컴포넌트 — 순수 렌더만.
 */
export function OptionViewer({
  view,
  option,
  creator,
  code,
}: {
  view: BoxViewerData
  option: BoxViewerOption
  creator: BoxViewerParticipant | null
  code: string
}) {
  const isChecklist = view.mode === 'checklist'
  const showLikes = !isChecklist && view.participant_count > 1
  const blocks = parseBlocks(option.content)

  return (
    <main className="flex min-h-dvh flex-col bg-cream">
      <div className="sticky top-0 z-20 border-b border-line bg-paper/95 px-5 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] backdrop-blur">
        <div className="mx-auto flex max-w-[430px] items-center gap-2">
          <a href={`/invite/${code}`} aria-label="뒤로" className="p-1 text-ink"><Icon name="back" size={20} /></a>
          <Image src="/icons/icon-192.png" alt="" width={20} height={20} className="rounded-[6px]" />
          <p className="flex items-center gap-1 text-[12px] font-bold text-ink-soft">
            결정창고 · <span className="inline-flex items-center gap-1 text-ink-faint"><Icon name="eye" size={13} />구경 중 (읽기 전용)</span>
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[430px] flex-1 space-y-4 px-5 pb-10 pt-4">
        <div className="space-y-3">
          {isChecklist && option.group_label && (
            <span className="inline-flex w-fit items-center rounded-full border border-line bg-cream px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
              {option.group_label}
            </span>
          )}

          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink">{option.name}</h1>

          {creator && (
            <div className="flex items-center gap-2 text-[12px]">
              <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-butter-tint">
                {creator.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={creator.avatar_url} alt={creator.nickname} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-ink">
                    {creator.nickname?.[0] ?? '?'}
                  </div>
                )}
              </div>
              <span className="font-bold text-ink-soft">{creator.nickname}</span>
              <span className="text-ink-faint">· {formatKoreanDate(option.created_at)}</span>
            </div>
          )}

          {!isChecklist && (
            <div className="flex items-center gap-2">
              {showLikes && (
                <span className="flex items-center gap-1 text-[13px] font-bold text-ink-soft">
                  <Icon name="heart" size={15} />
                  <span className="tabular-nums">{option.like_count}</span>
                </span>
              )}
              {option.decided_at && (
                <span className="flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-bold text-cream">
                  <Icon name="check" size={11} />
                  결정
                </span>
              )}
            </div>
          )}
        </div>

        {blocks.length > 0 && (
          <div className="space-y-3 rounded-card border border-[#ECEADC] bg-paper p-5">
            {blocks.map(block => renderBlock(block))}
          </div>
        )}

        <div className="space-y-4 rounded-card border border-[#ECEADC] bg-paper p-5">
          <h2 className="text-[13.5px] font-extrabold text-ink">
            댓글 {option.comments.length > 0 ? option.comments.length : ''}
          </h2>
          <OptionCommentsExpanded comments={option.comments} />
        </div>
      </div>
    </main>
  )
}

/** 선택지 본문 블록(글·사진·링크·유튜브)을 읽기 전용으로 렌더 — option-detail-client와 동일 마크업. */
function renderBlock(block: ReturnType<typeof parseBlocks>[number]) {
  if (block.type === 'text') {
    return <RichText key={block.id} text={block.text} className="space-y-1.5 text-[13.5px] leading-relaxed text-ink" />
  }
  if (block.type === 'image') {
    return (
      <a key={block.id} href={linkHref(block.url)} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.url} alt="첨부 사진" className="h-auto w-full rounded-[14px] border border-line" />
      </a>
    )
  }
  const ytId = parseYouTubeId(block.url)
  if (ytId) {
    return (
      <div key={block.id} className="space-y-1.5">
        <YouTubeEmbed videoId={ytId} />
        {block.label && (
          <p className="border-t border-dashed border-line pt-2 text-[13px] text-ink-soft">📝 {block.label}</p>
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
              <img
                src={proxiedImageUrl(block.image)}
                alt=""
                className="h-14 w-14 rounded-[10px] border border-line object-cover"
              />
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
          {block.description && <p className="line-clamp-1 text-[11.5px] text-ink-soft">{block.description}</p>}
          <p className="truncate text-[11px] text-ink-faint">{block.url}</p>
        </div>
      </a>
      {block.label && (
        <p className="mt-2 border-t border-dashed border-line pt-2 text-[13px] text-ink-soft">📝 {block.label}</p>
      )}
    </div>
  )
}
