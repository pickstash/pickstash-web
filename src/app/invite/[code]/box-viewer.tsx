import Image from 'next/image'
import { Icon } from '@/components/icon'
import { ModeChip } from '@/components/mode-chip'
import { PencilCircle } from '@/components/pencil-circle'
import { parseBlocks, getOptionPreview } from '@/lib/domain/option-content'
import { getBoxStatus } from '@/lib/domain/box-status'
import { getLeaderKey } from '@/lib/domain/winner'
import { proxiedImageUrl } from '@/lib/api/unfurl'
import { formatKoreanDate, formatDeadline } from '@/lib/utils'
import type { BoxViewerData } from '@/lib/api/invites'
import { JoinClient } from './join-client'

/**
 * 로그인 안 한 사용자도 초대 링크로 상자를 '읽기 전용'으로 보는 뷰어.
 * 049: 참여자 화면(BoxDetailClient)과 같은 라벨·카드 스타일을 쓰고, 선택지는 미리보기 카드만 보여준 뒤
 * 탭하면 `/invite/[code]/option/[optionId]`(전체 본문 + 댓글 전체)로 페이지 이동한다 — 한 페이지에
 * 다 욱여넣지 않는다. 서버 컴포넌트 — 순수 렌더만. 참여·좋아요·댓글 등 쓰기 액션은 없고 하단 CTA로 유도.
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
  const isChecklist = view.mode === 'checklist'
  const showLikes = !isChecklist && view.participant_count > 1 // 혼자 상자·체크형 상자는 좋아요 미표시 (앱과 동일)

  const decidedOptions = view.options.filter(o => o.decided_at)
  // '인기' — 참여자 화면과 동일한 임계값 규칙(단독 + 2개 이상)을 domain 함수로 그대로 재사용.
  const leaderKey = showLikes ? getLeaderKey(view.options.map(o => ({ key: o.id, like: o.like_count }))) : null
  const leaderName = leaderKey ? view.options.find(o => o.id === leaderKey)?.name ?? null : null

  return (
    <main className="flex min-h-dvh flex-col bg-cream">
      {/* 읽기 전용 안내 바 — sticky top이라 노치 아래로 내리려면 safe-area-inset-top 필요(토스 iOS). */}
      <div className="sticky top-0 z-20 border-b border-line bg-paper/95 px-5 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] backdrop-blur">
        <div className="mx-auto flex max-w-[430px] items-center gap-2">
          <Image src="/icons/icon-192.png" alt="" width={22} height={22} className="rounded-[7px]" />
          <p className="flex items-center gap-1 text-[12px] font-bold text-ink-soft">
            결정창고 · <span className="inline-flex items-center gap-1 text-ink-faint"><Icon name="eye" size={13} />구경 중 (읽기 전용)</span>
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[430px] flex-1 space-y-4 px-5 pb-28 pt-4">
        {/* 상자 헤더 — 참여자 화면과 동일하게 모드 칩을 앞세운다. */}
        <section className="space-y-3">
          <div className="flex items-center gap-1.5">
            <ModeChip mode={isChecklist ? 'checklist' : 'decide'} />
            <span className="text-[11.5px] text-ink-faint">{view.participant_count}명 참여 중</span>
          </div>

          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-ink">{view.title}</h1>

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
            만든 날 {formatKoreanDate(view.created_at)}
            {view.decision_mode === 'auto_deadline' && !isDone && ` · 마감 ${formatDeadline(view.deadline_at)}`}
          </p>
        </section>

        {/* 결정 결과 (정리완료) — 참여자 화면과 동일한 PencilCircle 스탬프. */}
        {isDone && (
          <section className="space-y-4 rounded-card bg-butter-tint p-5">
            <div className="flex flex-col items-start gap-2.5 text-left">
              <PencilCircle>정리완료!</PencilCircle>
              {isChecklist ? (
                <p className="text-[13.5px] text-ink-soft">목록을 정리했어요</p>
              ) : decidedOptions.length > 0 ? (
                <p className="text-[18px] font-extrabold leading-snug text-ink">
                  <span className="[box-shadow:inset_0_-9px_0_#FFD84A]">{decidedOptions.map(o => o.name).join(', ')}</span>
                  (으)로 결정!
                </p>
              ) : (
                <p className="text-[13.5px] text-ink-soft">결정 없이 마무리됐어요</p>
              )}
            </div>
          </section>
        )}

        {/* 인기 (진행 중 · 여럿·결정형 상자) — 참여자 화면과 동일 문구·임계값. */}
        {!isChecklist && !isDone && showLikes && leaderName && (
          <p className="text-[12.5px] font-bold text-ink-soft">
            인기 · <span className="text-ink">{leaderName}</span>
          </p>
        )}

        {/* 선택지 목록 — 참여자 화면(OptionsSection)과 같은 미리보기 카드. 탭하면 전체 본문·댓글 페이지로. */}
        <section className="space-y-2.5">
          <h2 className="px-0.5 text-[13.5px] font-extrabold text-ink">{isChecklist ? '항목' : '선택지'} {view.options.length}개</h2>

          {view.options.length === 0 ? (
            <p className="rounded-card border border-dashed border-line py-8 text-center text-[13px] text-ink-faint">
              {isChecklist ? '아직 항목이 없어요.' : '아직 선택지가 없어요.'}
            </p>
          ) : (
            <div className="space-y-2.5">
              {view.options.map(option => {
                const preview = getOptionPreview(parseBlocks(option.content))
                const isDecided = !!option.decided_at
                const isLeader = !isDone && showLikes && leaderKey === option.id
                return (
                  <a
                    key={option.id}
                    href={`/invite/${code}/option/${option.id}`}
                    className={`relative block rounded-[18px] border p-3.5 active:opacity-80 ${
                      isDecided ? 'border-butter-dark bg-butter-tint' : 'border-[#ECEADC] bg-paper'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          {!isChecklist && isDecided && (
                            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-ink pl-1 pr-1.5 py-0.5 text-[10px] font-extrabold text-cream">
                              <Icon name="check" size={10} strokeWidth={3} />
                              결정
                            </span>
                          )}
                          {!isChecklist && isLeader && (
                            <span className="shrink-0 rounded-md bg-butter px-1.5 py-0.5 text-[10px] font-extrabold text-ink shadow-[0_1px_0_#E3B93A]">
                              인기
                            </span>
                          )}
                          <span className="min-w-0 truncate text-[14.5px] font-extrabold text-ink">{option.name}</span>
                        </div>

                        {isChecklist && option.group_label && (
                          <span className="inline-flex w-fit items-center rounded-full border border-line bg-cream px-2 py-0.5 text-[10.5px] font-bold text-ink-soft">
                            {option.group_label}
                          </span>
                        )}

                        <p className="line-clamp-2 whitespace-pre-line text-xs leading-relaxed text-ink-soft">
                          {preview.snippet || ' '}
                        </p>

                        <div className="flex items-center gap-3">
                          {!isChecklist && showLikes && (
                            <span className="flex items-center gap-1 text-[12px] font-bold text-ink-faint">
                              <Icon name="heart" size={13} />
                              <span className="tabular-nums">{option.like_count}</span>
                            </span>
                          )}
                          {option.comments.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-faint">
                              <Icon name="comment" size={12} />
                              {option.comments.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {preview.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={proxiedImageUrl(preview.image)}
                          alt=""
                          className="h-14 w-14 shrink-0 rounded-[12px] border border-line object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] border border-line bg-cream text-ink-faint" aria-hidden>
                          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="3" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </a>
                )
              })}
            </div>
          )}
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
