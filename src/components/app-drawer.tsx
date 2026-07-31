'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNav, AppLink } from '@/lib/nav/nav'
import { signOut } from '@/lib/api/auth'
import { Icon } from '@/components/icon'
import { useFolders } from '@/hooks/use-folders'

type PwaPrompt = Event & { prompt(): Promise<void> }
declare global { interface Window { __pwaPrompt?: PwaPrompt } }

type BrowserType = 'standalone' | 'ios-safari' | 'ios-inapp' | 'android-inapp' | 'installable'

function detectBrowser(): BrowserType {
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone'
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isInApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|Snapchat/i.test(ua)
  if (isIOS && isInApp) return 'ios-inapp'
  if (isIOS) return 'ios-safari'
  if (/Android/.test(ua) && isInApp) return 'android-inapp'
  if (/Safari\//.test(ua) && !/Chrome|CriOS|OPR|Edg\/|SamsungBrowser/.test(ua)) return 'ios-safari'
  return 'installable'
}

interface AppDrawerProps {
  nickname: string
}

/** 드로어 폴더 진입 — 무한 목록 대신 '폴더 모아보기'(/folders) 한 줄. 폴더가 많아도 드로어가 안 길어진다. */
function DrawerFolders({ onNavigate }: { onNavigate: () => void }) {
  const { data: folders = [] } = useFolders()
  return (
    <AppLink
      href="/folders"
      onClick={onNavigate}
      className="mt-1 flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm font-semibold text-ink hover:bg-cream active:bg-butter-tint"
    >
      <Icon name="folder" size={18} className="text-ink-soft" />
      <span className="flex-1">폴더</span>
      {folders.length > 0 && <span className="text-[12px] font-bold tabular-nums text-ink-faint">{folders.length}</span>}
      <span className="text-ink-faint">›</span>
    </AppLink>
  )
}

export function AppDrawer({ nickname }: AppDrawerProps) {
  const [open, setOpen] = useState(false)
  const [browser, setBrowser] = useState<BrowserType | null>(null)
  const [pwaPrompt, setPwaPrompt] = useState<PwaPrompt | null>(null)
  const nav = useNav()

  useEffect(() => {
    setBrowser(detectBrowser())
    if (window.__pwaPrompt) {
      setPwaPrompt(window.__pwaPrompt)
      return
    }
    const handle = () => {
      if (window.__pwaPrompt) setPwaPrompt(window.__pwaPrompt)
    }
    window.addEventListener('pwa-install-ready', handle)
    return () => window.removeEventListener('pwa-install-ready', handle)
  }, [])

  async function handleInstall() {
    if (!pwaPrompt) return
    await pwaPrompt.prompt()
    setPwaPrompt(null)
    setBrowser('standalone')
    setOpen(false)
  }

  function handleOpenExternal() {
    const url = location.href.replace(/^https?:\/\//, '')
    location.href = `intent://${url}#Intent;scheme=https;end`
  }

  async function handleLogout() {
    await signOut()
    nav.replace('/login') // 로그아웃 후 앱으로 back하면 인증가드 리다이렉트 → 교체
  }

  // 토스는 상단 우측을 토스 시스템 버튼(···/X)이 차지해 햄버거가 겹친다 → 드로어 숨기고 하단 탭바로 이동.
  if (nav.platform === 'toss') return null

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1 text-ink" aria-label="메뉴">
        <Icon name="menu" size={22} strokeWidth={2} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] xl:inset-y-10 xl:left-1/2 xl:w-full xl:max-w-[430px] xl:-translate-x-1/2 xl:overflow-hidden xl:rounded-[30px]">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 flex-col rounded-l-sheet bg-paper shadow-[-8px_0_24px_rgba(42,42,39,0.1)]">
            <div className="border-b border-[#F1EFE0] px-5 pt-12 pb-5">
              <p className="text-[13px] text-ink-faint">안녕하세요</p>
              <p className="mt-0.5 text-[17px] font-extrabold tracking-tight text-ink">{nickname}님</p>
            </div>

            <nav className="flex-1 space-y-1 px-2.5 py-4">
              <AppLink
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm font-semibold text-ink hover:bg-cream active:bg-butter-tint"
              >
                <Icon name="home" size={18} className="text-ink-soft" />
                홈으로
              </AppLink>

              <p className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">결정창고</p>
              {([
                { href: '/messy', icon: 'box', name: '어질러진 창고' },
                { href: '/done', icon: 'check', name: '정리된 창고' },
                { href: '/favorites', icon: 'star', name: '즐겨찾는 창고' },
              ] as const).map(({ href, icon, name }) => (
                <AppLink
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm font-semibold text-ink hover:bg-cream active:bg-butter-tint"
                >
                  <Icon name={icon} size={18} className="text-ink-soft" />
                  {name}
                </AppLink>
              ))}

              <DrawerFolders onNavigate={() => setOpen(false)} />

              <div className="pt-3">
                <p className="px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-faint">마이페이지</p>
                <AppLink href="/profile" onClick={() => setOpen(false)} className="flex items-center rounded-[14px] px-3 py-2.5 text-sm font-semibold text-ink hover:bg-cream active:bg-butter-tint">
                  프로필 관리
                </AppLink>
                {/* 그룹 개념 정립 전까지 '그룹 관리' 숨김 */}
              </div>
            </nav>

            <div className="space-y-2 border-t border-[#F1EFE0] px-3.5 pb-10 pt-4">
              {/* 앱 설치 영역 */}
              {browser === 'installable' && (
                <button
                  onClick={pwaPrompt ? handleInstall : undefined}
                  disabled={!pwaPrompt}
                  className="flex w-full items-center justify-between rounded-[14px] bg-butter-tint px-3 py-2.5 text-sm font-bold text-ink active:opacity-80 disabled:opacity-40"
                >
                  <span>앱으로 설치하기</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              )}

              {browser === 'android-inapp' && (
                <button
                  onClick={handleOpenExternal}
                  className="flex w-full items-center justify-between rounded-[14px] bg-butter-tint px-3 py-2.5 text-sm font-bold text-ink active:opacity-80"
                >
                  <span>외부 브라우저로 열기</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}

              {(browser === 'ios-safari' || browser === 'ios-inapp') && (
                <div className="space-y-2 rounded-[14px] bg-butter-tint px-3 py-2.5">
                  <p className="text-[11px] font-bold text-ink-soft">앱으로 설치하기</p>
                  {browser === 'ios-inapp' && (
                    <p className="flex items-center gap-1 text-xs text-ink-soft">
                      <span className="shrink-0">①</span>
                      하단
                      <span className="rounded bg-paper px-1 py-0.5 text-ink">···</span>
                      또는 공유 버튼 탭
                    </p>
                  )}
                  {browser === 'ios-inapp' && (
                    <p className="flex items-center gap-1 text-xs text-ink-soft">
                      <span className="shrink-0">②</span>
                      <span className="font-semibold text-ink">Safari로 열기</span> 선택
                    </p>
                  )}
                  <p className="flex items-center gap-1 text-xs text-ink-soft">
                    <span className="shrink-0">{browser === 'ios-inapp' ? '③' : '①'}</span>
                    하단 공유 버튼
                    <span className="rounded bg-paper px-1 py-0.5 text-ink">↑</span>
                    탭
                  </p>
                  <p className="flex items-center gap-1 text-xs text-ink-soft">
                    <span className="shrink-0">{browser === 'ios-inapp' ? '④' : '②'}</span>
                    <span className="font-semibold text-ink">&quot;홈 화면에 추가&quot;</span> 선택
                  </p>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full rounded-[14px] px-3 py-2.5 text-left text-sm font-semibold text-tomato hover:bg-tomato-tint"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
