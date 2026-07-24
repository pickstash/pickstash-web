'use client'

import { useState } from 'react'
import Script from 'next/script'

interface InviteClientProps {
  boxId: string
  boxTitle: string
  inviteUrl: string
}

// 그룹 개념 정립 전까지 '그룹으로 초대'는 숨김 (그룹 API/훅/페이지는 유지)
export function InviteClient({ boxTitle, inviteUrl }: InviteClientProps) {
  const [copied, setCopied] = useState(false)
  const [kakaoReady, setKakaoReady] = useState(false)

  function handleKakaoShare() {
    if (!kakaoReady) return
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: boxTitle,
        description: '투표하러 가기',
        link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl },
      },
      buttons: [{ title: '투표하러 가기', link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl } }],
    })
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = inviteUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
          crossOrigin="anonymous"
          onReady={() => {
            const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
            if (key && window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key)
            setKakaoReady(true)
          }}
        />
      )}

      <div className="space-y-2.5">
        {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
          <button
            onClick={handleKakaoShare}
            disabled={!kakaoReady}
            className="flex w-full items-center justify-center gap-2 rounded-field bg-kakao py-4 text-sm font-bold text-kakao-ink disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 11c0 2.989 1.657 5.616 4.153 7.179-.179.63-.644 2.268-.739 2.619-.118.432.158.427.332.311.136-.091 2.158-1.469 3.032-2.063A11.3 11.3 0 0 0 12 19c5.523 0 10-3.477 10-8s-4.477-8-10-8z"/>
            </svg>
            카카오톡으로 초대
          </button>
        )}

        <button
          onClick={handleCopyLink}
          className="flex w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-ink bg-paper py-4 text-sm font-bold text-ink active:bg-cream"
        >
          {copied ? '링크 복사됨!' : '초대링크 복사'}
        </button>
      </div>
    </>
  )
}
