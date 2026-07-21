import Image from 'next/image'
import { KakaoLoginButton } from './kakao-login-button'
import { TestLoginButtons } from './test-login-buttons'

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-[340px] flex-col items-center gap-9">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/icons/icon-192.png"
            alt="결정창고 로고"
            width={96}
            height={96}
            priority
            className="rounded-[26px] shadow-[0_2px_10px_rgba(42,42,39,0.08)]"
          />
          <h1 className="text-[26px] font-extrabold tracking-tight text-ink">결정창고</h1>
          <p className="text-[13px] text-ink-soft">대화는 흘러가도, 결정은 남도록</p>
        </div>
        <div className="w-full space-y-3">
          <KakaoLoginButton />
          <TestLoginButtons />
        </div>
      </div>
    </main>
  )
}
