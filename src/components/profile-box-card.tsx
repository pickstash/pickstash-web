'use client'

import { useRef } from 'react'
import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import type { PublicBoxCard } from '@/lib/api/social'

// 프로필(공개/저장함) 그리드 상자 카드 — 내·남 프로필 공유.
// 제목 먼저(위) → 바닥엔 모드 라벨 대신 상자 태그(#)를 표시(있을 때만). 고정 높이라 제목 줄 수와 무관하게 카드 높이 동일.
// onLongPress: 본인 프로필에서만 전달 — 길게 누르면 고정/해제 시트(부모가 소유). 남 프로필은 배지만 보이고 조작 불가.
// 049: 공개 상자는 /box/[id]가 비로그인 포함 읽기 전용으로 열려서(can_read_box) 항상 /box로 보낸다.
export function ProfileBoxCard({ box, onLongPress }: { box: PublicBoxCard; onLongPress?: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const startXY = useRef<{ x: number; y: number } | null>(null)

  const clear = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
  }
  const onPointerDown = (e: React.PointerEvent) => {
    if (!onLongPress) return
    fired.current = false
    startXY.current = { x: e.clientX, y: e.clientY }
    timer.current = setTimeout(() => { fired.current = true; onLongPress() }, 450)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    // 10px 넘게 움직이면 스크롤로 보고 롱프레스 취소(미세 흔들림은 유지).
    if (!startXY.current) return
    if (Math.abs(e.clientX - startXY.current.x) > 10 || Math.abs(e.clientY - startXY.current.y) > 10) clear()
  }
  const onClickCapture = (e: React.MouseEvent) => {
    // 롱프레스가 발동했으면 뒤따르는 클릭(=상자로 이동)을 캡처 단계에서 막는다.
    if (fired.current) { e.preventDefault(); e.stopPropagation() }
  }

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={clear}
      onPointerLeave={clear}
      onClickCapture={onClickCapture}
    >
      <AppLink href={`/box/${box.id}`} className="block">
        <div className="relative flex h-[104px] flex-col overflow-hidden rounded-[14px] border border-[#ECEADC] bg-paper/70 p-3 active:bg-butter-tint/40">
          {box.pinned_at && (
            <span className="absolute right-2 top-2 text-butter-deep" aria-label="상단 고정됨">
              <Icon name="pin" size={13} />
            </span>
          )}
          <h4 className="line-clamp-2 pr-4 text-[13px] font-extrabold leading-snug text-ink">{box.title}</h4>
          {/* 모드 라벨 대신 상자 태그 — mt-auto로 항상 바닥, 한 줄 넘치면 잘라냄. 태그 없으면 아무것도 안 보임. */}
          {box.tags.length > 0 && (
            <p className="mt-auto truncate pt-2 text-[11px] font-bold text-butter-deep">
              {box.tags.map(t => `#${t}`).join(' ')}
            </p>
          )}
        </div>
      </AppLink>
    </div>
  )
}
