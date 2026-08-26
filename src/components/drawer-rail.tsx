'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDragSensors, useDragClickGuard, lockX, lockY, SortableItem } from '@/components/sortable-list'
import { createClient } from '@/lib/supabase/client'
import { loadFolders } from '@/lib/api/folders-list'
import { useFolderBoxes, useReorderFolders, useReorderFolderBoxes } from '@/hooks/use-folders'
import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { Spinner } from '@/components/spinner'
import { BoxSummaryCard } from '@/components/box-summary-card'
import { HomeBriefView } from '@/components/home-brief'
import type { BoxCard, HomeBrief } from '@/lib/domain/home'

interface DrawerRailProps {
  brief: HomeBrief // "브리핑" 칩(첫 자리·기본 선택)의 내용 — 마감임박/즐겨찾기소식/최근결정
}

type FolderChip = { id: string; name: string; boxCount: number }

// 모듈 스코프 — 상자 상세 등으로 나갔다가 홈으로 돌아오면 이 컴포넌트가 리마운트되는데, useState 기본값만
// 쓰면 매번 '브리핑'으로 리셋된다. 마지막으로 고른 칩을 기억해 되돌아왔을 때 그대로 유지되게 한다.
let lastSelectedFolder = 'all'

// 서랍 레일 — "브리핑" 칩이 항상 첫 자리(기본 선택)로 고정돼 홈이 비지 않는다. 칩을 누르면
// 하단에 그 서랍의 상자가 스태거 애니메이션으로 "꺼내진" 느낌으로 등장(별도 배경 래핑 없음).
// 서랍 칩끼리 / 서랍 안 상자끼리는 드래그로 재정렬 가능(브리핑·"새 서랍" 칩은 고정).
export function DrawerRail({ brief }: DrawerRailProps) {
  const [selected, setSelectedState] = useState<string>(lastSelectedFolder)
  function setSelected(next: string) {
    lastSelectedFolder = next
    setSelectedState(next)
  }
  const sensors = useDragSensors()
  const reorderFolders = useReorderFolders()

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
  const folders: FolderChip[] = foldersData?.cards ?? []

  const isAll = selected === 'all'
  const folderId = isAll ? undefined : selected
  const { data: folderData, isPending: folderPending } = useFolderBoxes(folderId)
  const reorderBoxes = useReorderFolderBoxes(folderId ?? '')

  const items: BoxCard[] = !isAll && folderData?.status === 'ok' ? folderData.cards : []

  // 나만보기 상자(049) 시각 구분 — folder-view와 동일 조건(공유 서랍 + 내가 담은 솔로 상자 + shared=false).
  // cards엔 shared/addedByMe가 없어 items에서 맵을 만든다.
  const folderShared = (folderData?.status === 'ok' ? folderData.members.length : 0) > 1
  const privateById = new Map(
    (folderData?.status === 'ok' ? folderData.items : []).map(
      i => [i.box.id, folderShared && i.participants.length <= 1 && i.addedByMe && !i.shared] as const,
    ),
  )

  // 낙관적 순서 — 드래그 즉시 반영. 서버 목록(id 집합)이 바뀔 때만 리셋(렌더 중 파생 조정, effect 없음).
  const foldersKey = folders.map(f => f.id).join(',')
  const itemsKey = items.map(c => c.id).join(',')
  const [order, setOrder] = useState({ foldersKey, folderOrder: folders, itemsKey, boxOrder: items })
  if (order.foldersKey !== foldersKey || order.itemsKey !== itemsKey) {
    setOrder({ foldersKey, folderOrder: folders, itemsKey, boxOrder: items })
  }
  const { folderOrder, boxOrder } = order
  const setFolderOrder = (next: FolderChip[]) => setOrder(o => ({ ...o, folderOrder: next }))
  const setBoxOrder = (next: BoxCard[]) => setOrder(o => ({ ...o, boxOrder: next }))

  function onChipDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = folderOrder.findIndex(f => f.id === active.id)
    const to = folderOrder.findIndex(f => f.id === over.id)
    if (from < 0 || to < 0) return
    const next = arrayMove(folderOrder, from, to)
    setFolderOrder(next)
    reorderFolders.mutate(next.map(f => f.id))
  }

  function onBoxDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = boxOrder.findIndex(c => c.id === active.id)
    const to = boxOrder.findIndex(c => c.id === over.id)
    if (from < 0 || to < 0) return
    const next = arrayMove(boxOrder, from, to)
    setBoxOrder(next)
    // 048: box_folders.sort는 담은 사람(added_by)별. 남이 공유한 상자를 저장하면 내 이름으로 새로
    // 담아버리므로, 내가 담은 상자(addedByMe)만 그 상대 순서로 저장한다(folder-view finishEdit와 동일).
    const mine = new Set(
      (folderData?.status === 'ok' ? folderData.items : []).filter(i => i.addedByMe).map(i => i.box.id),
    )
    const mineOrdered = next.filter(c => mine.has(c.id)).map(c => c.id)
    if (mineOrdered.length > 0) reorderBoxes.mutate(mineOrdered)
  }

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

        <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll={false} modifiers={[lockY]} onDragEnd={onChipDragEnd}>
          <SortableContext items={folderOrder.map(f => f.id)} strategy={horizontalListSortingStrategy}>
            {folderOrder.map(f => (
              <SortableChip
                key={f.id}
                folder={f}
                active={f.id === selected}
                onSelect={() => setSelected(f.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

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
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll={false} modifiers={[lockX]} onDragEnd={onBoxDragEnd}>
              <SortableContext items={boxOrder.map(c => c.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {boxOrder.map((card, i) => (
                    <SortableBox key={card.id} card={card} index={i} isPrivate={privateById.get(card.id) ?? false} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {/* 상자들 아래 단일 진입 — 서랍 상세로 이동(거기서 상자 담기·순서·공유·이름변경·나가기). */}
            <AppLink
              href={`/folder/${folderId}`}
              className="mt-2.5 flex items-center justify-center gap-1 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 py-3 text-[13px] font-bold text-ink-soft active:bg-paper/80"
            >
              서랍으로 가기
              <Icon name="chevronRight" size={14} strokeWidth={2.4} />
            </AppLink>
          </>
        )}
      </div>
    </section>
  )
}

function SortableChip({ folder, active, onSelect }: { folder: FolderChip; active: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: folder.id })
  const onClickCapture = useDragClickGuard(isDragging) // 드래그로 재정렬 후 클릭이 새어 서랍이 선택되는 것 방지
  return (
    <button
      ref={setNodeRef}
      onClick={onSelect}
      onClickCapture={onClickCapture}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 10 : undefined }}
      {...attributes}
      {...listeners}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition-colors ${
        active ? 'border-butter-deep bg-butter-tint text-ink' : 'border-[#ECEADC] bg-paper text-ink active:bg-butter-tint/50'
      }`}
    >
      <Icon name="folder" size={13} className={active ? 'text-ink' : 'text-ink-soft'} />
      {folder.name}
      <span className="text-ink-faint">{folder.boxCount}</span>
    </button>
  )
}

// 카드는 AppLink(탭=이동)라 공용 SortableItem 사용 — 드래그 후 클릭 누수·자식 링크 네이티브 드래그 가드 공유.
// pop 애니메이션은 안쪽 div에 두어 dnd transform과 분리.
function SortableBox({ card, index, isPrivate }: { card: BoxCard; index: number; isPrivate: boolean }) {
  return (
    <SortableItem id={card.id}>
      <div
        className="[animation-fill-mode:backwards] animate-[drawerPop_0.4s_cubic-bezier(.16,1,.3,1)]"
        style={{ animationDelay: `${index * 55}ms` }}
      >
        <BoxSummaryCard card={card} isPrivate={isPrivate} />
      </div>
    </SortableItem>
  )
}
