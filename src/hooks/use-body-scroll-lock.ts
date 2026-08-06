'use client'

import { useEffect } from 'react'

/**
 * 바텀시트·모달이 열린 동안 뒤 화면(문서) 스크롤을 잠근다.
 * locked=true면 html·body overflow를 hidden으로, 닫히면 복원. 시트 내부(overflow-y-auto) 스크롤은 영향 없음.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
    }
  }, [locked])
}
