import { KakaoLoginButton } from './kakao-login-button'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-[390px] flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">결정창고</h1>
          <p className="text-sm text-gray-500 text-center">
            친구들과 함께 의사결정을 내리는 공간
          </p>
        </div>
        <KakaoLoginButton />
      </div>
    </main>
  )
}
