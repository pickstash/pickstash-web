'use client'

import { useEffect, useState } from 'react'

type PwaPrompt = Event & { prompt(): Promise<void> }

declare global {
  interface Window {
    __pwaPrompt?: PwaPrompt
  }
}

type InstallState = 'installable' | 'ios' | 'hidden'

export function PwaInstallBanner() {
  const [state, setState] = useState<InstallState>('hidden')
  const [deferredPrompt, setDeferredPrompt] = useState<PwaPrompt | null>(null)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    if (isStandalone || dismissed) return

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
    if (isIOS) {
      setState('ios')
      return
    }

    // layout의 early capture 스크립트가 이미 잡아둔 이벤트 확인
    if (window.__pwaPrompt) {
      setDeferredPrompt(window.__pwaPrompt)
      setState('installable')
      return
    }

    // 아직 안 왔으면 커스텀 이벤트로 대기
    function handleReady() {
      if (window.__pwaPrompt) {
        setDeferredPrompt(window.__pwaPrompt)
        setState('installable')
      }
    }

    window.addEventListener('pwa-install-ready', handleReady)
    return () => window.removeEventListener('pwa-install-ready', handleReady)
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
        {state === 'installable' && (
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
