'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface InfiniteRevealResult {
  /** 현재 노출할 항목 개수 (0..total) */
  visibleCount: number
  /** 목록 끝 센티넬에 붙일 ref. 화면에 들어오면 pageSize만큼 더 노출한다. */
  sentinelRef: (node: Element | null) => void
  /** 더 노출할 항목이 남았는지 */
  hasMore: boolean
}

/**
 * 이미 메모리에 있는 목록을 스크롤에 따라 점진적으로 노출하는 클라이언트 무한스크롤 훅.
 * 데이터는 이미 로드돼 있다고 가정하고 렌더 개수만 늘린다 (서버 페이지네이션 아님).
 *
 * @param total     전체 항목 개수
 * @param pageSize  한 번에 늘릴 개수 (초기 노출 개수이기도 함)
 * @param resetKey  값이 바뀌면 visibleCount를 pageSize로 되돌린다 (예: 정렬 모드 변경).
 *                  identity로 비교하므로 반드시 primitive(string·number 등)를 넘길 것.
 *                  매 렌더 새로 생성되는 객체/배열을 넘기면 무한 렌더가 발생한다.
 */
export function useInfiniteReveal(
  total: number,
  pageSize: number,
  resetKey?: unknown,
): InfiniteRevealResult {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const [prevResetKey, setPrevResetKey] = useState<unknown>(resetKey)

  // resetKey(예: 정렬 모드)가 바뀌면 렌더 중에 즉시 초기화한다.
  // effect + setState보다 권장되는 패턴 (react.dev "You Might Not Need an Effect").
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey)
    setVisibleCount(pageSize)
  }

  const hasMore = visibleCount < total
  const observerRef = useRef<IntersectionObserver | null>(null)

  const sentinelRef = useCallback(
    (node: Element | null) => {
      observerRef.current?.disconnect()
      if (!node) return
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount((c) => Math.min(c + pageSize, total))
          }
        },
        { rootMargin: '200px' },
      )
      observerRef.current.observe(node)
    },
    [pageSize, total],
  )

  useEffect(() => () => observerRef.current?.disconnect(), [])

  return { visibleCount, sentinelRef, hasMore }
}
