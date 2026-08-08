'use client'

import { useCallback, useRef, type MouseEvent } from 'react'

// 롱프레스(꾸욱) 감지 — 포인터 다운 후 delay(ms) 유지 시 onLongPress 발동. 업·이탈·취소 시 해제.
// suppressClick(): 롱프레스가 발동했으면 뒤따르는 click을 1회 삼켜, 좋아요 토글과 안 겹치게 한다.
export function useLongPress(onLongPress: () => void, delay = 450) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const onPointerDown = useCallback(() => {
    fired.current = false
    clear()
    timer.current = setTimeout(() => {
      fired.current = true
      onLongPress()
    }, delay)
  }, [clear, delay, onLongPress])

  const suppressClick = useCallback(() => {
    if (fired.current) {
      fired.current = false
      return true
    }
    return false
  }, [])

  return {
    suppressClick,
    handlers: {
      onPointerDown,
      onPointerUp: clear,
      onPointerLeave: clear,
      onPointerCancel: clear,
      onContextMenu: (e: MouseEvent) => e.preventDefault(),
    },
  }
}
