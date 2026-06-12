'use client'

import { useEffect, useState } from 'react'

type InstallState = 'android' | 'ios' | 'hidden'

export function PwaInstallBanner() {
  const [state, setState] = useState<InstallState>('hidden')
  const [deferredPrompt, setDeferredPrompt] = useState<Event & { prompt(): Promise<void> } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 이미 설치됨(standalone) 이거나 이미 닫은 경우 숨김
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (isStandalone || dismissed) return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)

    if (isIOS) {
      // iOS는 beforeinstallprompt 없음 — 안내 배너만 표시
      setState('ios')
      return
    }

    // Android/Chrome: beforeinstallprompt 이벤트 대기
    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as Event & { prompt(): Promise<void> })
      setState('android')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

  function handleDismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setState('hidden')
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    setState('hidden')
  }

  if (state === 'hidden') return null

  return (
    <div className="mx-5 mt-4 bg-white border border-gray-200 rounded-2xl px-4 py-4 flex gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
        <img src="/icons/icon-192.png" alt="결정창고" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">앱으로 설치하기</p>
        {state === 'ios' ? (
          <p className="text-xs text-gray-400 mt-0.5">
            하단 공유 버튼(<span className="font-medium">↑</span>) → "홈 화면에 추가"를 탭하세요
          </p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">빠르게 실행하고 알림을 받을 수 있어요</p>
        )}
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <button onClick={handleDismiss} className="text-gray-300 p-0.5">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {state === 'android' && (
          <button
            onClick={handleInstall}
            className="text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            설치
          </button>
        )}
      </div>
    </div>
  )
}
