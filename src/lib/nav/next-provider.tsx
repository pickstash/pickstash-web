'use client'

// 웹(Next) 전용 NavProvider 구현. AppNav를 Next 라우터에 바인딩한다.
import { useRouter } from 'next/navigation'
import { useMemo, type ReactNode } from 'react'
import { NavProvider, type AppNav } from './nav'

export function NextNavProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const nav: AppNav = useMemo(
    () => ({
      platform: 'web',
      push: href => router.push(href),
      replace: href => router.replace(href),
      back: () => router.back(),
      refresh: () => router.refresh(),
    }),
    [router],
  )
  return <NavProvider nav={nav}>{children}</NavProvider>
}
