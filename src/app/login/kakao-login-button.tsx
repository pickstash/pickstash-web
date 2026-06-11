'use client'

import { signInWithKakao } from '@/lib/api/auth'
import { useState } from 'react'

export function KakaoLoginButton() {
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    try {
      await signInWithKakao()
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogin}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#FEE500] px-6 py-4 text-sm font-semibold text-[#191919] shadow-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-60"
    >
      <KakaoIcon />
      {loading ? '로그인 중...' : '카카오 로그인'}
    </button>
  )
}

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.477 3 2 6.477 2 10.94c0 2.875 1.694 5.397 4.25 6.912L5.15 21.1a.5.5 0 0 0 .72.54l4.47-2.96c.54.075 1.093.115 1.66.115 5.523 0 10-3.477 10-7.816C22 6.477 17.523 3 12 3z" />
    </svg>
  )
}
