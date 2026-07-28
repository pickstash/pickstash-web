import Image from 'next/image'
import { KakaoLoginButton } from './kakao-login-button'

export default function LoginPage() {
  return (
    <main className="flex h-dvh flex-col items-center overflow-hidden px-6 py-12">
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
          <KakaoLoginButton />
        </div>
      </div>
    </main>
  )
}
