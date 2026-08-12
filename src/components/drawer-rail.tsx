'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { loadFolders } from '@/lib/api/folders-list'
import { useFolderBoxes } from '@/hooks/use-folders'
import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { Spinner } from '@/components/spinner'
import { BoxSummaryCard } from '@/components/box-summary-card'
import { HomeBriefView } from '@/components/home-brief'
import type { BoxCard, HomeBrief } from '@/lib/domain/home'

interface DrawerRailProps {
  brief: HomeBrief // "브리핑" 칩(첫 자리·기본 선택)의 내용 — 마감임박/즐겨찾기소식/최근결정
}

// 서랍 레일 — "브리핑" 칩이 항상 첫 자리(기본 선택)로 고정돼 홈이 비지 않는다. 칩을 누르면
// 하단에 그 서랍의 상자가 스태거 애니메이션으로 "꺼내진" 느낌으로 등장(별도 배경 래핑 없음).
// 전체 상자 브라우징은 상자 탭이 전담 — 홈 첫 화면은 큐레이션된 브리핑.
export function DrawerRail({ brief }: DrawerRailProps) {
  const [selected, setSelected] = useState<string>('all')

  const { data: foldersData } = useQuery({
    queryKey: ['folders-page'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('세션이 없어요')
      return loadFolders(supabase, user.id)
    },
    refetchOnMount: 'always',
  })
  const folders = foldersData?.cards ?? []

  const isAll = selected === 'all'
  const folderId = isAll ? undefined : selected
  const { data: folderData, isPending: folderPending } = useFolderBoxes(folderId)

  const items: BoxCard[] = !isAll && folderData?.status === 'ok' ? folderData.cards : []

  return (
    <section>
      <style>{`
        @keyframes drawerPop {
          0% { opacity: 0; transform: translateY(-14px) scale(.94); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* 레일 — folder-chips.tsx 톤. 선택 시 hero와 같은 butter 강조. */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setSelected('all')}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
            isAll ? 'border-butter-deep bg-butter-tint text-ink' : 'border-[#ECEADC] bg-paper text-ink active:bg-butter-tint/50'
          }`}
        >
          <Icon name="pin" size={13} className={isAll ? 'text-ink' : 'text-ink-soft'} />
          브리핑
        </button>

        {folders.map(f => {
          const active = f.id === selected
          return (
            <button
              key={f.id}
              onClick={() => setSelected(f.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
                active ? 'border-butter-deep bg-butter-tint text-ink' : 'border-[#ECEADC] bg-paper text-ink active:bg-butter-tint/50'
              }`}
            >
              <Icon name="folder" size={13} className={active ? 'text-ink' : 'text-ink-soft'} />
              {f.name}
              <span className="text-ink-faint">{f.boxCount}</span>
            </button>
          )
        })}

        <AppLink
          href="/folders"
          className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#D9D6C2] px-3.5 py-2 text-[12.5px] font-bold text-ink-soft active:bg-cream"
        >
          <Icon name="plus" size={13} strokeWidth={2.4} />
          새 서랍
        </AppLink>
      </div>

      {/* 브리핑(전체 자리) 또는 선택한 서랍의 상자 목록 — 별도 배경 래핑 없이 페이지 바탕 위에 바로 */}
      <div key={selected} className="mt-3 px-5">
        {/* 서랍 선택 시 "전체 보기"는 그 서랍 상세(/folder/[id])로 — 요약 카드만 있는 레일과 달리
            거기서 순서 변경·추가·제외가 된다. */}
        {!isAll && !folderPending && items.length > 0 && (
          <div className="mb-2 flex justify-end px-1">
            <AppLink href={`/folder/${folderId}`} className="flex items-center gap-0.5 text-[13px] font-bold text-ink-soft active:text-ink">
              전체 보기
              <Icon name="chevronRight" size={12} />
            </AppLink>
          </div>
        )}

        {isAll ? (
          <HomeBriefView brief={brief} />
        ) : folderPending ? (
          <Spinner className="py-8" />
        ) : items.length === 0 ? (
          // options-section.tsx 빈 상태와 동일 톤(점선 카드+원형 아이콘 배지). 서랍 상세로 보내
          // 거기서 바로 새 상자를 만들거나 기존 상자를 담을 수 있게(그 화면의 '+ 상자' 시트).
          <AppLink
            href={`/folder/${folderId}`}
            className="flex flex-col items-center gap-2 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-8 text-center active:bg-paper/80"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-butter-tint text-ink">
              <Icon name="plus" size={16} strokeWidth={2.4} />
            </span>
            <p className="text-[13.5px] font-bold text-ink">이 서랍은 비어 있어요</p>
            <p className="text-[12px] text-ink-soft">서랍으로 가서 상자를 담아보세요</p>
          </AppLink>
        ) : (
          <div className="space-y-2.5">
            {items.map((card, i) => (
              <div
                key={card.id}
                className="[animation-fill-mode:backwards] animate-[drawerPop_0.4s_cubic-bezier(.16,1,.3,1)]"
                style={{ animationDelay: `${i * 55}ms` }}
              >
                <BoxSummaryCard card={card} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
