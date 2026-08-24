'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useNav } from '@/lib/nav/nav'
import { Icon, type IconName } from '@/components/icon'
import { getAlerts } from '@/lib/api/alerts'
import { useRealtimeAlerts } from '@/hooks/use-realtime-alerts'

// 웹 하단 탭바 — 토스앱(toss/src/components/tab-bar.tsx)과 픽셀 동일한 플로팅 캡슐.
// 토스는 react-router라 별도 파일이고, 여기 웹판은 next 라우팅을 쓴다(마크업·스펙은 동일).
// 5탭 — 홈 / 서랍(상자·서랍 통합) / 둘러보기 / 알림 / 프로필.
const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: '/', icon: 'home', label: '홈' },
  { href: '/boxes', icon: 'folder', label: '서랍' },
  { href: '/explore', icon: 'search', label: '둘러보기' },
  { href: '/alerts', icon: 'bell', label: '알림' },
  { href: '/profile', icon: 'user', label: '프로필' },
]

// 하위 화면 소속 탭 매핑(활성 표시용). 상자 상세·서랍은 '서랍' 탭 소속.
function tabOf(p: string): string {
  if (p === '/') return '/'
  if (
    p === '/boxes' || p.startsWith('/box/') || p === '/messy' || p === '/done' ||
    p === '/bookmarks' || p === '/favorites' || p === '/folders' || p.startsWith('/folder/')
  ) return '/boxes'
  if (p.startsWith('/explore') || p.startsWith('/p/') || p.startsWith('/u/')) return '/explore'
  if (p.startsWith('/alerts')) return '/alerts'
  if (p.startsWith('/profile')) return '/profile'
  return ''
}

// 탭바를 숨기는 '집중'·비로그인 화면들(토스 App.tsx showTabBar 판정을 웹 경로로 옮김).
function isHidden(p: string): boolean {
  return (
    p === '/login' ||
    p === '/box/new' ||
    p === '/profile/withdraw' ||
    p === '/profile/settings' ||
    p === '/terms' ||
    p === '/privacy' ||
    p.endsWith('/option/new') ||
    p.endsWith('/edit') ||
    p.startsWith('/invite/') ||
    p.startsWith('/folder-invite/') ||
    p.startsWith('/group-invite/') ||
    p.startsWith('/u/') ||
    p.startsWith('/follows/')
  )
}

export function TabBar() {
  const nav = useNav()
  const pathname = usePathname() ?? '/'
  const rootRef = useRef<HTMLDivElement>(null)
  const hidden = isHidden(pathname)
  // 포털(document.body)은 클라 전용이라 SSR 첫 렌더와 어긋나 하이드레이션 미스매치가 난다.
  // 서버·클라 첫 렌더 모두 null로 맞춘 뒤(mounted=false), 마운트 이후에만 포털을 그린다.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // 알림 실시간 구독을 앱 셸(탭바)에서 항상 켠다 — 다른 탭에 있어도 배지가 갱신되도록.
  useRealtimeAlerts()

  // 알림 탭 배지 — 안읽음(unseen) 개수. 알림함과 같은 ['alerts'] 캐시 공유.
  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts(),
    enabled: !hidden,
  })
  const unseenCount = alerts.filter((a) => a.unseen).length

  // 탭바 실측 높이를 --app-tabbar-h로, 그리고 하위 화면의 고정 CTA/FAB가 참조하는 --app-nav-h·
  // --app-cta-safe를 :root에 반영한다(토스 App.tsx가 wrapper div에 하던 계산을 웹은 여기서).
  // 웹엔 고정 광고 배너가 없어 --app-nav-h == --app-tabbar-h. 탭바가 홈 인디케이터를 전담하므로
  // 탭바 화면에선 --app-cta-safe=0(이중 인셋 방지). 숨긴 화면은 0/기본값으로 되돌린다.
  useLayoutEffect(() => {
    const root = document.documentElement
    const sync = () => {
      const el = rootRef.current
      if (hidden || !el) {
        // 탭바 없는 화면: 하위 CTA는 각자 xl:bottom-10(프레임 하단)/모바일 0을 쓰므로 여기선 0.
        root.style.setProperty('--app-nav-h', '0px')
        root.style.removeProperty('--app-cta-safe') // globals.css 기본값(env inset)으로 복귀
        return
      }
      // CTA/FAB가 탭바 '위로' 뜨도록 '뷰포트 바닥→탭바 상단' 거리를 --app-nav-h로 준다.
      // ⚠️ PC(xl)는 탭바가 프레임 여백(xl:bottom-10)만큼 떠 있어 offsetHeight만으론 부족 →
      //    rect.top 기준으로 계산해야 PC에서 CTA가 탭바를 덮지 않는다.
      root.style.setProperty('--app-tabbar-h', `${el.offsetHeight}px`)
      root.style.setProperty('--app-nav-h', `${Math.round(window.innerHeight - el.getBoundingClientRect().top)}px`)
      root.style.setProperty('--app-cta-safe', '0px')
    }
    sync()
    // rect.top은 뷰포트 높이·xl 경계에 따라 바뀌므로 resize에도 재계산(ResizeObserver는 위치 변화엔 안 뜸).
    const el = rootRef.current
    const observer = el ? new ResizeObserver(sync) : null
    if (el && observer) observer.observe(el)
    window.addEventListener('resize', sync)
    return () => { observer?.disconnect(); window.removeEventListener('resize', sync) }
  }, [hidden, mounted])

  if (hidden || !mounted) return null

  const activeHref = tabOf(pathname)

  // 미니앱과 동일하게 화면 가장자리에 붙지 않고 좌우·하단 여백을 둔 뜬 캡슐(pill). 웹은 safe-area가
  // env로 충분(안드로이드 과다보고 이슈는 웹뷰 전용). xl(PC)에선 중앙 폰 프레임 하단 안쪽으로 띄운다.
  // ⚠️ document.body로 포털한다 — .app-frame(xl 스크롤 프레임) 안에 두면 이 fixed가 프레임에 갇혀
  // 세로로 stretch돼 화면 전체를 뒤덮는다(PC=xl에서만 발현, 태블릿 이하는 앱이 풀폭이라 안 보임).
  // 포털로 프레임 밖(뷰포트 기준)에 띄우면 해결. AppDrawer가 오버레이를 body로 포털하는 것과 같은 이유.
  return createPortal(
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2"
      style={{ paddingBottom: 'max(12px, calc(env(safe-area-inset-bottom) + 6px))' }}
    >
      <nav className="pointer-events-auto w-full max-w-[402px] rounded-full bg-paper shadow-[0_8px_24px_rgba(42,42,39,0.18)]">
        <div className="flex h-[60px] items-center justify-around px-3">
          {TABS.map((t) => {
            const active = activeHref === t.href
            return (
              <button
                key={t.href}
                onClick={() => { if (pathname !== t.href) nav.push(t.href) }}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold ${
                  active ? 'text-ink' : 'text-ink-faint'
                }`}
              >
                <span className="relative">
                  <Icon name={t.icon} size={22} strokeWidth={active ? 2.1 : 1.75} />
                  {t.href === '/alerts' && unseenCount > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tomato px-1 text-[9px] font-extrabold leading-none text-white">
                      {unseenCount > 99 ? '99+' : unseenCount}
                    </span>
                  )}
                </span>
                {t.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>,
    document.body,
  )
}
