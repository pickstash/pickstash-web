'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TEST_ACCOUNTS = [
  { label: '테스트 1', email: 'test1@pickstash.dev', password: '1234', nickname: '테스트1' },
  { label: '테스트 2', email: 'test2@pickstash.dev', password: '1234', nickname: '테스트2' },
]

// 프로덕션에서는 노출하지 않는다 (NEXT_PUBLIC_ENABLE_TEST_LOGIN=true로 강제 노출 가능)
const TEST_LOGIN_ENABLED =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN === 'true'

export function TestLoginButtons() {
  const router = useRouter()
  const [loading, setLoading] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!TEST_LOGIN_ENABLED) return null

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
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-faint">테스트</span>
        <div className="h-px flex-1 bg-line" />
      </div>

      {TEST_ACCOUNTS.map((account, i) => (
        <button
          key={i}
          onClick={() => handleLogin(i)}
          disabled={loading !== null}
          className="w-full rounded-field border border-dashed border-line py-3 text-sm font-medium text-ink-soft hover:bg-paper active:bg-butter-tint disabled:opacity-50"
        >
          {loading === i ? '로그인 중...' : account.label}
        </button>
      ))}

      {error && <p className="text-center text-xs text-tomato">{error}</p>}
    </div>
  )
}
