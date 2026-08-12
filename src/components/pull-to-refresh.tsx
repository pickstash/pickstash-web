'use client'

import { useRef, useState, type ReactNode } from 'react'

// 아래로 당겨 새로고침 — 웹·토스 공유. 문서 스크롤이 맨 위일 때만 당김을 인식한다.
// onRefresh는 보통 해당 화면 쿼리 invalidate. 실제 감(임계치·감속)은 실기기에서 미세조정 권장.
const THRESHOLD = 70 // px, 이만큼 당기면 새로고침

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown> | void
  children: ReactNode
}) {
  const startY = useRef<number | null>(null)
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)

  function atTop() {
    return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 0
  }

  return (
    <div
      className="overscroll-y-contain"
      onTouchStart={e => {
        if (busy || !atTop()) { startY.current = null; return }
        startY.current = e.touches[0].clientY
      }}
      onTouchMove={e => {
        if (startY.current === null || busy) return
        const dy = e.touches[0].clientY - startY.current
        setPull(dy > 0 ? Math.min(dy * 0.5, THRESHOLD + 24) : 0)
      }}
      onTouchEnd={async () => {
        if (startY.current === null) return
        startY.current = null
        const reached = pull >= THRESHOLD
        setPull(0)
        if (reached) {
          setBusy(true)
          // 조회가 즉시 끝나도 스핀이 보이도록 최소 노출시간(600ms) 확보 후 영역 접기.
          try { await Promise.all([onRefresh(), new Promise(r => setTimeout(r, 600))]) } finally { setBusy(false) }
        }
      }}
    >
      <div
        style={{ height: busy ? 40 : pull, transition: startY.current === null ? 'height 0.2s' : undefined }}
        className="flex items-end justify-center overflow-hidden"
      >
        {/* 새로고침 스피너 — 당기는 순간부터 계속 회전(인스타식), 조회 끝나면 영역째 사라진다. */}
        <span
          className={`mb-2 text-ink-soft ${busy || pull > 0 ? 'animate-spin' : ''}`}
          style={{ opacity: busy ? 1 : Math.min(pull / THRESHOLD, 1) }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </span>
      </div>
      {children}
    </div>
  )
}
