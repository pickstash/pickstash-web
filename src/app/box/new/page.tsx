import Link from 'next/link'
import { CreateBoxForm } from './create-box-form'

export default function NewBoxPage() {
  return (
    <main className="min-h-screen bg-white flex flex-col">
      <header className="px-5 pt-12 pb-4 flex items-center gap-3 border-b border-gray-100">
        <Link href="/" className="text-gray-400 text-sm">취소</Link>
        <h1 className="flex-1 text-center text-base font-semibold text-gray-900">상자 만들기</h1>
        <div className="w-8" />
      </header>
      <CreateBoxForm />
    </main>
  )
}
