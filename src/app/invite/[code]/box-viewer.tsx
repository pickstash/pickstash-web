import Image from 'next/image'
import { Icon } from '@/components/icon'
import { YouTubeEmbed } from '@/components/youtube-embed'
import {
  parseBlocks,
  linkFallbackTitle,
  linkHref,
  linkKindOf,
  linkKindEmoji,
  parseYouTubeId,
} from '@/lib/domain/option-content'
import { getBoxStatus, BOX_STATUS_LABEL } from '@/lib/domain/box-status'
import { proxiedImageUrl } from '@/lib/api/unfurl'
import { formatKoreanDate, formatDeadline } from '@/lib/utils'
import type { BoxViewerData } from '@/lib/api/invites'
import { JoinClient } from './join-client'
import { OptionComments } from './option-comments'

/**
 * 로그인 안 한 사용자도 초대 링크로 상자 전체를 '읽기 전용'으로 보는 뷰어(노션식).
 * 서버 컴포넌트 — 순수 렌더만. 참여·좋아요·댓글 등 쓰기 액션은 없고 하단 로그인 CTA로 유도.
 */
export function BoxViewer({
  view,
  isLoggedIn,
  code,
}: {
  view: BoxViewerData
  isLoggedIn: boolean
  code: string
}) {
  const status = getBoxStatus({ closed_at: view.closed_at })
  const isDone = status === 'RESOLVED'
  const showLikes = view.participant_count > 1 // 혼자 상자는 좋아요 미표시 (앱과 동일)

  const maxLikes = view.options.reduce((m, o) => Math.max(m, o.like_count), 0)
  const decidedNames = view.options.filter(o => o.decided_at).map(o => o.name)

  return (
    <main className="flex min-h-dvh flex-col bg-cream">
      {/* 읽기 전용 안내 바 — sticky top이라 노치 아래로 내리려면 safe-area-inset-top 필요(토스 iOS). */}
      <div className="sticky top-0 z-20 border-b border-line bg-paper/95 px-5 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] backdrop-blur">
        <div className="mx-auto flex max-w-[430px] items-center gap-2">
          <Image src="/icons/icon-192.png" alt="" width={22} height={22} className="rounded-[7px]" />
          <p className="text-[12px] font-bold text-ink-soft">
            결정창고 · <span className="text-ink-faint">구경 중 (읽기 전용)</span>
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[430px] flex-1 space-y-4 px-5 pb-28 pt-4">
        {/* 상자 헤더 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                isDone ? 'bg-butter text-ink' : 'border border-line text-ink-soft'
              }`}
            >
              {BOX_STATUS_LABEL[status]}
            </span>
            <span className="text-[11.5px] text-ink-faint">{view.participant_count}명 참여 중</span>
          </div>

          <h1 className="text-[23px] font-extrabold leading-tight tracking-tight text-ink">{view.title}</h1>

          {view.memo && (
            <p className="rounded-[14px] border border-dashed border-[#D9D6C2] px-3 py-2.5 text-[13px] text-ink-soft">
              ✏️ {view.memo}
            </p>
          )}

          {/* 참여자 아바타 */}
          {view.participants.length > 0 && (
            <div className="flex items-center -space-x-1.5">
              {view.participants.slice(0, 6).map(p => (
                <div
                  key={p.id}
                  className="h-7 w-7 overflow-hidden rounded-full border border-paper bg-butter-tint"
                  title={p.nickname}
                >
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt={p.nickname} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-ink">
                      {p.nickname?.[0] ?? '?'}
                    </div>
                  )}
                </div>
              ))}
              {view.participant_count > 6 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-paper bg-cream text-[10px] font-bold text-ink-soft">
                  +{view.participant_count - 6}
                </div>
              )}
            </div>
          )}

          <p className="text-[11.5px] text-ink-faint">
            {formatKoreanDate(view.created_at)} 만듦
            {view.decision_mode === 'auto_deadline' && ` · 마감 ${formatDeadline(view.deadline_at)}`}
          </p>
        </section>

        {/* 결정 결과 (정리완료) */}
        {isDone && (
          <section className="rounded-card border border-butter-dark/30 bg-butter-tint p-4">
            {decidedNames.length > 0 ? (
              <p className="text-[15px] font-extrabold text-ink">
                <span className="bg-butter px-1 underline decoration-butter-dark decoration-2">
                  {decidedNames.join(', ')}
                </span>
                (으)로 결정!
              </p>
            ) : (
              <p className="text-[14px] font-bold text-ink-soft">결정 없이 마무리됐어요.</p>
            )}
          </section>
        )}

        {/* 선택지 목록 */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-extrabold text-ink-soft">선택지 {view.options.length}개</h2>

          {view.options.length === 0 && (
            <p className="rounded-card border border-dashed border-line py-8 text-center text-[13px] text-ink-faint">
              아직 선택지가 없어요.
            </p>
          )}

          {view.options.map(option => {
            const blocks = parseBlocks(option.content)
            const isDecided = !!option.decided_at
            const isLeader = !isDone && showLikes && maxLikes > 0 && option.like_count === maxLikes

            return (
              <article
                key={option.id}
                className={`space-y-3 rounded-card border p-4 ${
                  isDecided ? 'border-butter-dark/40 bg-butter-tint' : 'border-[#ECEADC] bg-paper'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 text-[16px] font-extrabold leading-snug text-ink">{option.name}</h3>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isDecided && (
                      <span className="flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[10.5px] font-bold text-cream">
                        <Icon name="check" size={11} />
                        결정
                      </span>
                    )}
                    {isLeader && (
                      <span className="rounded-full bg-butter px-2 py-0.5 text-[10.5px] font-bold text-ink">
                        1위
                      </span>
                    )}
                    {showLikes && (
                      <span className="flex items-center gap-1 text-[12px] font-bold text-ink-faint">
                        <Icon name="heart" size={13} />
                        <span className="tabular-nums">{option.like_count}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* 본문 블록 */}
                {blocks.length > 0 && <div className="space-y-3">{blocks.map(renderBlock)}</div>}

                {/* 댓글 — 기본 접힘, '댓글 N개 보기' 토글(선택지별) */}
                <OptionComments comments={option.comments} />
              </article>
            )
          })}
        </section>
      </div>

      {/* 하단 고정 참여 CTA — 토스는 --app-nav-h(탭바 높이)만큼 띄운다. 웹은 var 미정의→0(bottom:0).
          pb에 --app-cta-safe(iOS 홈 인디케이터 인셋)를 더해 하단 잘림 방지. */}
      <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 border-t border-line bg-paper/95 px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] backdrop-blur">
        <div className="mx-auto max-w-[430px] space-y-1.5">
          <p className="text-center text-[11.5px] text-ink-faint">
            {isLoggedIn ? '참여하면 좋아요·댓글로 함께 정할 수 있어요' : '로그인하면 좋아요·댓글로 함께 정할 수 있어요'}
          </p>
          <JoinClient code={code} isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </main>
  )
}

/** 선택지 본문 블록(글·사진·링크·유튜브)을 읽기 전용으로 렌더 — option-detail과 동일 마크업. */
function renderBlock(block: ReturnType<typeof parseBlocks>[number]) {
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
        <img src={block.url} alt="첨부 사진" className="h-auto w-full rounded-[14px] border border-line" />
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
