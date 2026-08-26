import Image from 'next/image'
// 카카오 로그인은 일단 숨김(토스 로그인만) — 재도입 시 KakaoLoginButton 다시 import.
import { TossLoginButton } from './toss-login-button'
import { TestLoginButtons } from './test-login-buttons'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  return (
    <main className="flex min-h-dvh flex-col items-center px-6 py-12">
      <div className="flex w-full max-w-[340px] flex-1 flex-col items-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
          <Image
            src="/icons/icon_main.svg"
            alt="결정창고 로고"
            width={82}
            height={63}
            priority
          />
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink mt-4">결정창고</h1>
          <p className="text-[13px] text-ink-soft">대화는 흘러가도, 결정은 남도록</p>
        </div>
        <div className="w-full pb-4">
          <TossLoginButton next={next} />
          {process.env.NODE_ENV === 'development' && <TestLoginButtons />}
        </div>
      </div>
    </main>
  )
}
