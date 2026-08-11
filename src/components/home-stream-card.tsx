'use client'

import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { leadersLabel, type OpenBoxCard } from '@/components/decision-hero'
import { formatDday } from '@/lib/utils'

/**
 * 홈 "내 상자" 세로 스트림 카드 — 결정형/체크형 mode-aware.
 * 체크형: 진행률(N/M). 결정형: 인기/좋아요/댓글(여럿) 또는 '혼자 쓰는 상자'. 마감투표는 D-day 배지.
 */
export function HomeStreamCard({ box }: { box: OpenBoxCard }) {
  const dday = box.isAuto && box.deadlineAt ? formatDday(box.deadlineAt) : null
  const urgent = dday === 'D-day' || dday === 'D-1' || dday === '마감 지남'
  return (
    <AppLink href={`/box/${box.id}`} className="block">
      <div className="rounded-card border border-[#ECEADC] bg-paper p-4 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${box.mode === 'checklist' ? 'bg-leaf-tint text-[#37714A]' : 'bg-butter-tint text-ink'}`}>
              {box.mode === 'checklist' ? '체크' : '결정'}
            </span>
            <h3 className="truncate text-[15.5px] font-extrabold leading-snug tracking-tight text-ink">{box.title}</h3>
          </div>
          {dday && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-extrabold ${urgent ? 'bg-tomato-tint text-tomato' : 'bg-cream text-ink-soft'}`}>
              마감 {dday}
            </span>
          )}
        </div>

        {box.mode === 'checklist' ? (
          <p className="mt-2 flex items-center gap-1 text-[12.5px] font-bold text-ink-soft">
            <Icon name="check" size={13} strokeWidth={2.5} />
            {box.checked}/{box.total} 체크
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] font-extrabold text-ink-soft">
            {!box.isSolo && box.leaders.length > 0 && (
              <span className="flex min-w-0 items-center gap-1 text-ink">
                <span className="shrink-0 rounded-full bg-butter px-[7px] py-0.5 text-[10.5px]">인기</span>
                <span className="min-w-0 truncate">{leadersLabel(box.leaders)}</span>
              </span>
            )}
            {!box.isSolo && box.totalLikes > 0 && (
              <span className="flex items-center gap-1 tabular-nums"><Icon name="heart" size={13} />{box.totalLikes}</span>
            )}
            {!box.isSolo && box.totalComments > 0 && (
              <span className="flex items-center gap-1 tabular-nums"><Icon name="comment" size={13} />{box.totalComments}</span>
            )}
            {box.isSolo && (
              <span className="flex items-center gap-1 font-semibold"><Icon name="box" size={12} />혼자 쓰는 상자</span>
            )}
          </div>
        )}
      </div>
    </AppLink>
  )
}
