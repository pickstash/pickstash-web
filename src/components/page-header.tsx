'use client'

import { useRouter } from 'next/navigation'
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
  const router = useRouter()

  function handleBack() {
    // Next.js App Router가 관리하는 히스토리 인덱스. 앱 내부에서 진입했으면 > 0.
    // window.history.length는 브라우저의 이전 페이지까지 포함해 부정확하고,
    // 리다이렉트되는 페이지로 back 하면 무한루프가 나므로 idx를 기준으로 삼는다.
    const idx = typeof window !== 'undefined' ? window.history.state?.idx : undefined
    if (typeof idx === 'number' && idx > 0) {
      router.back()
    } else {
      router.push(fallbackHref)
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
