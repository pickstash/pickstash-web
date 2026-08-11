import { AppLink, useNav } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { formatDday } from '@/lib/utils'
import { leadersLabel, type HeroParticipant, type OpenBoxCard } from '@/components/decision-hero'

/** 미니 카드용 소형 참여자 아바타 스택 (히어로보다 작게). */
function RailAvatars({ participants, max = 3 }: { participants: HeroParticipant[]; max?: number }) {
  const shown = participants.slice(0, max)
  const extra = participants.length - shown.length
  return (
    <div className="flex -space-x-1">
      {shown.map(p => (
        <div key={p.user_id} className="flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full border border-paper bg-cream text-[8px] font-bold text-ink">
          {p.profiles?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.profiles.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            p.profiles?.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-paper bg-cream text-[8px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

/** 마감 코너 배지 — 카드 우상단(텍스트 흐름 밖). 급하면 토마토, 여유면 차분. */
function CornerDeadline({ deadlineAt }: { deadlineAt: string }) {
  const label = formatDday(deadlineAt)
  const urgent = label === 'D-day' || label === 'D-1' || label === '마감 지남'
  return (
    <span
      className={`absolute right-2.5 top-2.5 rounded-lg px-1.5 py-1 text-[9.5px] font-extrabold leading-none ${
        urgent ? 'bg-tomato-tint text-tomato' : 'bg-cream text-ink-soft'
      }`}
    >
      {label}
    </span>
  )
}

/**
 * "정리 중" 레일 — 히어로 다음 상자들을 가로 스크롤 미니 카드로.
 * 카드 = 제목(2줄) → 하단 그룹[1위 → 참여자]. 마감은 우상단 코너 배지로 빼 제목/1위 흐름을 안 건드린다.
 * 높이 120px 고정 + 하단 그룹으로, 마감/1위 유무·공동1위·긴 이름·혼자 어떤 케이스든 참여자 줄이 같은 자리에 온다.
 * boxes가 비면(어질러진 상자가 히어로 1개뿐) 섹션 자체를 렌더하지 않는다.
 */
export function DecisionRail({ boxes, totalOpen }: { boxes: OpenBoxCard[]; totalOpen: number }) {
  const nav = useNav()
  if (boxes.length === 0) return null

  // 토스는 '상자' 탭(/boxes)에서 필터를 바꿔 보여준다 → 별도 화면 대신 탭 액티브로. 웹은 /messy 화면 유지.
  const allHref = nav.platform === 'toss' ? '/boxes?filter=messy' : '/messy'

  return (
    <section className="pt-5">
      <div className="mb-2.5 flex items-center justify-between px-5">
        {/* 상자가 주인공 — 라벨은 얇게(“정리 중 · N”). */}
        <h2 className="text-[12px] font-bold text-ink-soft">정리 중 · {totalOpen}</h2>
        {/* '상자' 탭으로 가는 바로가기 — 레일이 뜨면(정리중 1개+) 항상 노출. */}
        <AppLink href={allHref} className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-ink-faint active:opacity-70">
          전체
          <Icon name="chevronRight" size={13} strokeWidth={2.5} />
        </AppLink>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {boxes.map(box => {
          const hasDeadline = box.isAuto && !!box.deadlineAt
          return (
            <AppLink key={box.id} href={`/box/${box.id}`} className="block shrink-0">
              <div className="relative flex h-[120px] w-[168px] flex-col overflow-hidden rounded-[18px] border border-[#ECEADC] bg-paper p-3.5 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
                {hasDeadline && <CornerDeadline deadlineAt={box.deadlineAt!} />}
                <h4 className={`line-clamp-2 text-[13px] font-extrabold leading-snug tracking-tight text-ink ${hasDeadline ? 'pr-10' : ''}`}>
                  {box.title}
                </h4>

                {box.mode === 'checklist' ? (
                  <span className="mt-auto inline-flex items-center gap-1 text-[11.5px] font-bold text-ink">
                    <Icon name="check" size={12} strokeWidth={2.5} />
                    {box.checked}/{box.total} 체크
                  </span>
                ) : box.isSolo ? (
                  <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-ink-faint">
                    <Icon name="box" size={11} />
                    혼자 쓰는 상자
                  </span>
                ) : (
                  /* 하단 그룹 — 1위 바로 위에 참여자(간격 3px). 1위 없으면 '후보 담는 중'으로 자리 유지. */
                  <div className="mt-auto flex flex-col gap-[3px]">
                    {box.leaders.length > 0 ? (
                      <span className="flex min-w-0 items-center gap-1 text-[11.5px] font-bold text-ink">
                        <span className="shrink-0 whitespace-nowrap rounded-full bg-butter px-1.5 py-0.5 text-[10px] font-extrabold">
                          인기
                        </span>
                        {/* 긴 항목 이름은 1줄 말줄임 */}
                        <span className="min-w-0 truncate">{leadersLabel(box.leaders)}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-ink-faint">후보 담는 중</span>
                    )}
                    {box.participants.length > 1 && (
                      <div className="flex items-center gap-1.5">
                        <RailAvatars participants={box.participants} />
                        <span className="text-[11px] font-semibold text-ink-faint">{box.participants.length}명</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AppLink>
          )
        })}
      </div>
    </section>
  )
}
