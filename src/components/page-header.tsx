'use client'

import { useNav } from '@/lib/nav/nav'
import type { ReactNode } from 'react'
import { Icon } from './icon'

interface PageHeaderProps {
  /** 비우면 헤더에 제목을 표시하지 않는다(히어로형 화면용) */
  title?: string
  /** 히스토리가 없을 때(딥링크 진입) 돌아갈 곳 */
  fallbackHref?: string
  right?: ReactNode
}

export function PageHeader({ title, fallbackHref = '/', right }: PageHeaderProps) {
  const nav = useNav()

  function handleBack() {
    // Next App Router는 history.state에 idx를 두지 않는다(항상 undefined). 이 값을 기준으로 삼던
    // 이전 로직은 매번 push(fallback)로 빠져 히스토리가 쌓였고, OS 뒤로가기가 같은 화면을
    // 오가는 루프를 만들었다. → 앱 내부 히스토리가 있으면 pop(뒤로), 없으면(딥링크 새 진입) 상위로.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      nav.back()
    } else {
      nav.push(fallbackHref)
    }
  }

  return (
    <header className="sticky top-0 z-10 flex items-center gap-2 bg-cream/95 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-1.5 backdrop-blur-sm">
      <button
        onClick={handleBack}
        aria-label="뒤로가기"
        className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink active:bg-butter-tint"
      >
        <Icon name="back" size={21} strokeWidth={2.1} />
      </button>
      {title ? (
        <h1 className="min-w-0 flex-1 truncate text-[17px] font-extrabold tracking-tight text-ink">{title}</h1>
      ) : (
        <div className="flex-1" />
      )}
      {right}
    </header>
  )
}
