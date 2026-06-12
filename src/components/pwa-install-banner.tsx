'use client'

import { useEffect, useState } from 'react'

type PwaPrompt = Event & { prompt(): Promise<void> }

declare global {
  interface Window { __pwaPrompt?: PwaPrompt }
}

type InstallState =
  | 'installable'    // Chrome/Samsung: beforeinstallprompt 있음
  | 'ios-safari'     // iOS Safari: 수동 홈 화면 추가
  | 'ios-inapp'      // iOS 인앱 브라우저: Safari로 열기 안내
  | 'android-inapp'  // Android 인앱 브라우저: Chrome으로 열기
  | 'hidden'

function detect(): InstallState {
  if (typeof window === 'undefined') return 'hidden'
  if (window.matchMedia('(display-mode: standalone)').matches) return 'hidden'
  if (localStorage.getItem('pwa-install-dismissed')) return 'hidden'

  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isInApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|Snapchat/i.test(ua)

  if (isIOS && isInApp) return 'ios-inapp'
  if (isIOS) return 'ios-safari'
  if (/Android/.test(ua) && isInApp) return 'android-inapp'

  // Chrome, Samsung, Edge 등 beforeinstallprompt 지원 브라우저
  return 'installable'
}

export function PwaInstallBanner() {
  const [state, setState] = useState<InstallState>('hidden')
  const [prompt, setPrompt] = useState<PwaPrompt | null>(null)

  useEffect(() => {
    const initial = detect()
    if (initial === 'hidden') return

    if (initial !== 'installable') {
      setState(initial)
      return
    }

    // installable: beforeinstallprompt 필요
    if (window.__pwaPrompt) {
      localStorage.setItem('pwa-was-installable', '1')
      setPrompt(window.__pwaPrompt)
      setState('installable')
      return
    }
    if (localStorage.getItem('pwa-was-installable')) {
      setState('installable')
      return
    }
    const handle = () => {
      if (window.__pwaPrompt) {
        localStorage.setItem('pwa-was-installable', '1')
        setPrompt(window.__pwaPrompt)
        setState('installable')
      }
    }
    window.addEventListener('pwa-install-ready', handle)
    return () => window.removeEventListener('pwa-install-ready', handle)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setState('hidden')
  }

  async function install() {
    if (prompt) {
      await prompt.prompt()
      localStorage.removeItem('pwa-was-installable')
      setState('hidden')
    }
  }

  function openChrome() {
    const url = location.href.replace(/^https?:\/\//, '')
    location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`
  }

  if (state === 'hidden') return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-6 pt-2">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* 앱 정보 행 */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          <img src="/icons/icon-192.png" alt="결정창고" className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">결정창고</p>
            <p className="text-xs text-gray-400 truncate">친구들과 함께 의사결정하는 앱</p>
          </div>
          <button onClick={dismiss} className="text-gray-300 p-1 shrink-0">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 상태별 안내 */}
        {state === 'installable' && (
          <div className="px-4 pb-4">
            <button
              onClick={install}
              className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold"
            >
              앱으로 설치하기
            </button>
          </div>
        )}

        {state === 'ios-safari' && (
          <div className="px-4 pb-4 space-y-3">
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">①</span>
              <p className="text-sm text-gray-700">
                하단 <span className="font-semibold">공유 버튼</span>
                <span className="inline-block mx-1 px-1.5 py-0.5 bg-gray-200 rounded text-xs">↑</span>
                을 탭하세요
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">②</span>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">"홈 화면에 추가"</span>를 선택하세요
              </p>
            </div>
          </div>
        )}

        {state === 'ios-inapp' && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-gray-500">Safari에서 열어야 앱을 설치할 수 있어요</p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">①</span>
              <p className="text-sm text-gray-700">
                우측 하단
                <span className="inline-block mx-1 px-1.5 py-0.5 bg-gray-200 rounded text-xs">···</span>
                또는 공유 버튼을 탭하세요
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-2xl">②</span>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">"Safari로 열기"</span>를 선택하세요
              </p>
            </div>
          </div>
        )}

        {state === 'android-inapp' && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs text-gray-500">Chrome에서 열어야 앱을 설치할 수 있어요</p>
            <button
              onClick={openChrome}
              className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold"
            >
              Chrome으로 열기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
