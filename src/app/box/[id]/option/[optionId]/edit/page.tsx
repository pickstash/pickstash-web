'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOption, useUpdateOption } from '@/hooks/use-options'
import { OptionForm } from '@/components/option-form'

export default function EditOptionPage({
  params,
}: {
  params: Promise<{ id: string; optionId: string }>
}) {
  const { id: boxId, optionId } = use(params)
  const router = useRouter()
  const { data: option, isLoading } = useOption(optionId)
  const updateOption = useUpdateOption(optionId, boxId)

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">불러오는 중...</p>
      </main>
    )
  }

  if (!option) {
    router.push(`/box/${boxId}`)
    return null
  }

  const summary = Array.isArray(option.summary)
    ? (option.summary as { text: string; order: number }[])
    : []
  const links = Array.isArray(option.links) ? (option.links as string[]) : []

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href={`/box/${boxId}/option/${optionId}`} className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">선택지 수정</h1>
      </header>

      <div className="flex-1 px-5 py-6">
        <OptionForm
          initialName={option.name}
          initialSummary={summary}
          initialMemo={option.memo ?? ''}
          initialLinks={links}
          isPending={updateOption.isPending}
          submitLabel="수정하기"
          onSubmit={data => {
            updateOption.mutate(
              { name: data.name, summary: data.summary, memo: data.memo, links: data.links },
              { onSuccess: () => router.push(`/box/${boxId}/option/${optionId}`) }
            )
          }}
          onCancel={() => router.push(`/box/${boxId}/option/${optionId}`)}
        />
      </div>
    </main>
  )
}
