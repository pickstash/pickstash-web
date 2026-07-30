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
  push(href: string): void
  replace(href: string): void
  back(): void
  /** 웹: RSC refresh. 토스: 쿼리 무효화 등 플랫폼별 매핑(없으면 no-op). */
  refresh(): void
}

const NavContext = createContext<AppNav | null>(null)

export function NavProvider({ nav, children }: { nav: AppNav; children: ReactNode }) {
  return <NavContext.Provider value={nav}>{children}</NavContext.Provider>
}

export function useNav(): AppNav {
  const nav = useContext(NavContext)
  if (!nav) throw new Error('useNav는 NavProvider 안에서만 사용할 수 있어요')
  return nav
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
