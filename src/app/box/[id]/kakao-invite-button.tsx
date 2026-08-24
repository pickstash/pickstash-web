'use client'

import { useEffect, useState } from 'react'
// window.Kakao 타입은 src/types/kakao.d.ts(전역). 재선언하면 충돌하므로 하지 않는다.

// 웹 전용 — 카카오톡으로 초대 링크 공유. box-detail-client가 아니라 웹 page.tsx가 prop으로 주입하므로
// 토스(vite) 빌드는 이 파일을 컴파일하지 않는다 → process.env·window.Kakao를 안전하게 쓸 수 있다.
export function KakaoInviteButton({ url, title }: { url: string; title: string }) {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!key) return
    const init = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key)
      setReady(true)
    }
    if (window.Kakao) {
      init()
      return
    }
    let s = document.getElementById('kakao-sdk') as HTMLScriptElement | null
    if (!s) {
      s = document.createElement('script')
      s.id = 'kakao-sdk'
      s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js'
      s.integrity = 'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4'
      s.crossOrigin = 'anonymous'
      document.head.appendChild(s)
    }
    s.addEventListener('load', init)
    const el = s
    return () => el.removeEventListener('load', init)
  }, [key])

  if (!key) return null

  function share() {
    if (!ready || !window.Kakao) return
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title,
        description: '투표하러 가기',
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: '투표하러 가기', link: { mobileWebUrl: url, webUrl: url } }],
    })
  }

  return (
    <button
      onClick={share}
      disabled={!ready}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-field bg-kakao py-3.5 text-sm font-bold text-kakao-ink active:opacity-80 disabled:opacity-50"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.477 3 2 6.477 2 11c0 2.989 1.657 5.616 4.153 7.179-.179.63-.644 2.268-.739 2.619-.118.432.158.427.332.311.136-.091 2.158-1.469 3.032-2.063A11.3 11.3 0 0 0 12 19c5.523 0 10-3.477 10-8s-4.477-8-10-8z" />
      </svg>
      카카오톡으로 초대
    </button>
  )
}
