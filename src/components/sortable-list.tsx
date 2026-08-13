'use client'

import type { ReactNode } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, type SortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 탭(선택/이동)과 드래그(재정렬)를 구분 — 마우스는 8px 이동, 터치는 long-press(200ms)로 시작.
// 터치 지연 센서라 짧은 스와이프는 스크롤·탭으로 흘려보낸다(모바일 스크롤 보존).
export function useDragSensors() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
}

// 드래그를 한 축에 가둔다 — overflow가 반대 축을 clip하는 레일·리스트에서 잘림 방지.
export const lockX: Modifier = ({ transform }) => ({ ...transform, x: 0 })
export const lockY: Modifier = ({ transform }) => ({ ...transform, y: 0 })

/** dnd-kit 정렬 리스트 래퍼 — DndContext+SortableContext+센서를 한 곳에. 자식은 render prop.
 *  DndContext/SortableContext는 DOM 래퍼가 없어 자식이 부모 레이아웃(grid/space-y)의 직접 자식이 된다. */
export function SortableList<T>({
  items,
  getId,
  strategy,
  modifiers,
  onReorder,
  children,
}: {
  items: T[]
  getId: (item: T) => string
  strategy?: SortingStrategy
  modifiers?: Modifier[]
  onReorder: (next: T[]) => void
  children: (item: T, index: number) => ReactNode
}) {
  const sensors = useDragSensors()
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = items.findIndex(i => getId(i) === active.id)
    const to = items.findIndex(i => getId(i) === over.id)
    if (from < 0 || to < 0) return
    onReorder(arrayMove(items, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} autoScroll={false} modifiers={modifiers} onDragEnd={onDragEnd}>
      <SortableContext items={items.map(getId)} strategy={strategy}>
        {items.map((it, i) => children(it, i))}
      </SortableContext>
    </DndContext>
  )
}

/** 드래그 가능한 래퍼(div). 자식이 링크·버튼을 포함할 수 있어 listeners만 붙여(attributes 생략)
 *  중첩 인터랙티브를 피한다 — 키보드 드래그 미지원(마우스/터치 전용). */
export function SortableItem({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : undefined }}
      className={className}
      {...listeners}
    >
      {children}
    </div>
  )
}
