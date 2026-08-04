'use client'

// 프레임워크 비의존 내비게이션 어댑터.
// 화면(공유 컴포넌트)은 next/navigation·next/link 대신 이 모듈만 쓴다.
// 웹은 Next 라우터로, 토스앱은 클라이언트 라우터로 각각 NavProvider에 구현을 주입한다.
// → 화면 코드를 한 벌만 작성해 웹·토스가 공유한다.

import {
  createContext,
  useContext,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react'

export interface AppNav {
  /** 실행 플랫폼 — 웹/토스 분기용(토스는 상단 드로어 숨기고 하단 탭바 사용). */
  platform: 'web' | 'toss'
  push(href: string): void
  replace(href: string): void
  back(): void
  /** 웹: RSC refresh. 토스: 쿼리 무효화 등 플랫폼별 매핑(없으면 no-op). */
  refresh(): void
  /**
   * 인라인 로그인 후 resolve. 토스: appLogin→Supabase 세션.
   * 웹은 리다이렉트형 로그인이라 미구현(undefined) — 호출부가 로그인 페이지로 push하도록 폴백.
   */
  login?(): Promise<void>
}

const NavContext = createContext<AppNav | null>(null)

// provider 밖(전역 에러 페이지·not-found 등 root layout 밖 렌더)에서도 크래시하지 않도록
// 브라우저 기본 내비게이션으로 폴백한다. 서버(window 없음)에선 no-op.
const FALLBACK_NAV: AppNav = {
  platform: 'web',
  push: href => {
    if (typeof window !== 'undefined') window.location.assign(href)
  },
  replace: href => {
    if (typeof window !== 'undefined') window.location.replace(href)
  },
  back: () => {
    if (typeof window !== 'undefined') window.history.back()
  },
  refresh: () => {
    if (typeof window !== 'undefined') window.location.reload()
  },
}

export function NavProvider({ nav, children }: { nav: AppNav; children: ReactNode }) {
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>
}

export function useNav(): AppNav {
  return useContext(NavContext) ?? FALLBACK_NAV
}

type AppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  /** history를 쌓지 않고 교체 이동 */
  replace?: boolean
}

/** next/link 대체. <a href>를 렌더하되 클릭은 SPA 내비게이션으로 가로챈다. */
export function AppLink({ href, replace, onClick, children, ...rest }: AppLinkProps) {
  const nav = useNav()
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e)
    if (e.defaultPrevented) return
    // 새 탭/수정키/보조버튼 클릭은 브라우저 기본 동작을 유지한다.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    replace ? nav.replace(href) : nav.push(href)
  }
  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
