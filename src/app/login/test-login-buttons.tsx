'use client'

// 로컬 개발 전용 빠른 로그인 — 로그인 페이지에서 NODE_ENV==='development'일 때만 렌더(프로덕션 미노출).
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
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    })

    if (signInError) {
      // 계정 없으면 가입 후 프로필 upsert
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(null)
        return
      }
      if (data.user) {
        await supabase.from('profiles').upsert({ id: data.user.id, nickname: account.nickname, avatar_url: null })
      }
    }

    router.push('/')
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="w-full space-y-2 pt-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-soft">개발용 테스트 로그인</span>
        <div className="h-px flex-1 bg-line" />
      </div>
      {TEST_ACCOUNTS.map((account, i) => (
        <button
          key={i}
          onClick={() => handleLogin(i)}
          disabled={loading !== null}
          className="w-full rounded-field border border-dashed border-line py-3 text-sm font-medium text-ink-soft transition-colors hover:bg-butter-tint active:opacity-80 disabled:opacity-50"
        >
          {loading === i ? '로그인 중...' : account.label}
        </button>
      ))}
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </div>
  )
}
