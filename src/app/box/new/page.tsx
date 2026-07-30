import { AppLink } from '@/lib/nav/nav'
import { CreateBoxForm } from './create-box-form'

export default function NewBoxPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <AppLink href="/" className="text-[13px] font-semibold text-ink-soft">취소</AppLink>
        <h1 className="flex-1 text-center text-[17px] font-extrabold tracking-tight text-ink">상자 만들기</h1>
        <div className="w-8" />
      </header>
      <CreateBoxForm />
    </main>
  )
}
