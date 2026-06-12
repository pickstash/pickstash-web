'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TEST_ACCOUNTS = [
  { label: '테스트 1', email: 'test1@pickstash.dev', password: '1234', nickname: '테스트1' },
  { label: '테스트 2', email: 'test2@pickstash.dev', password: '1234', nickname: '테스트2' },
]

export function TestLoginButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(index: number) {
    const account = TEST_ACCOUNTS[index]
    setLoading(index)
    setError(null)

    const supabase = createClient()

    // 로그인 시도
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    })

    if (signInError) {
      // 계정 없으면 회원가입
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(null)
        return
      }

      // 프로필 생성 (트리거가 이메일 가입을 처리 못할 수 있으므로 upsert)
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nickname: account.nickname,
          avatar_url: null,
        })
      }
    }

    router.push('/')
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">테스트</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {TEST_ACCOUNTS.map((account, i) => (
        <button
          key={i}
          onClick={() => handleLogin(i)}
          disabled={loading !== null}
          className="w-full border border-dashed border-gray-300 text-gray-500 py-3 rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-gray-50 active:bg-gray-100"
        >
          {loading === i ? '로그인 중...' : account.label}
        </button>
      ))}

      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}
