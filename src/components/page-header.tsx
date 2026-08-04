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
    // 토스(MemoryRouter): window.history를 안 쓰므로 length 판정이 무의미(항상 push(홈)로 빠져 홈 점프·스택 증식).
    // MemoryRouter는 늘 홈("/")에서 시작하고 홈엔 뒤로가기가 없으니, 이 헤더가 뜬 화면은 전부 push로 도달 → 항상 pop이 안전.
    // (추후 initialEntries 딥링크 도입 시 재검토)
    if (nav.platform === 'toss') {
      nav.back()
      return
    }
    // 웹(Next/브라우저): 앱 내부 히스토리가 있으면 pop(뒤로), 없으면(딥링크 새 진입) 상위로.
    if (typeof window !== 'undefined' && window.history.length > 1) {
      nav.back()
    } else {
      nav.push(fallbackHref)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 bg-cream/95 px-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-1.5 backdrop-blur-sm">
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
