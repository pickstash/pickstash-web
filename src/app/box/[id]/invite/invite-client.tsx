'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'

interface InviteClientProps {
  boxTitle: string
  inviteUrl: string
}

export function InviteClient({ boxTitle, inviteUrl }: InviteClientProps) {
  const [copied, setCopied] = useState(false)
  const [kakaoReady, setKakaoReady] = useState(false)

  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
      if (key) {
        window.Kakao.init(key)
        setKakaoReady(true)
      }
    } else if (window.Kakao?.isInitialized()) {
      setKakaoReady(true)
    }
  }, [])

  function handleKakaoShare() {
    if (!kakaoReady) return
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: boxTitle,
        description: '투표하러 가기',
        link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl },
      },
      buttons: [
        {
          title: '투표하러 가기',
          link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl },
        },
      ],
    })
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API 미지원 시 fallback
      const textarea = document.createElement('textarea')
      textarea.value = inviteUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
        integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
        crossOrigin="anonymous"
        onLoad={() => {
          const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
          if (key && window.Kakao && !window.Kakao.isInitialized()) {
            window.Kakao.init(key)
          }
          setKakaoReady(true)
        }}
      />

      <div className="space-y-3">
        {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
          <button
            onClick={handleKakaoShare}
            disabled={!kakaoReady}
            className="w-full flex items-center justify-center gap-2 bg-[#FEE500] text-[#3C1E1E] py-4 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 11c0 2.989 1.657 5.616 4.153 7.179-.179.63-.644 2.268-.739 2.619-.118.432.158.427.332.311.136-.091 2.158-1.469 3.032-2.063A11.3 11.3 0 0 0 12 19c5.523 0 10-3.477 10-8s-4.477-8-10-8z"/>
            </svg>
            카카오톡으로 초대
          </button>
        )}

        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 py-4 rounded-xl text-sm font-semibold active:bg-gray-50"
        >
          {copied ? (
            <>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              링크 복사됨!
            </>
          ) : (
            <>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              초대링크 복사
            </>
          )}
        </button>
      </div>
    </>
  )
}
