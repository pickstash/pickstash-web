'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOption, useUpdateOption } from '@/hooks/use-options'
import { OptionForm } from '@/components/option-form'
import { parseBlocks } from '@/lib/domain/option-content'

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
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-ink-faint">불러오는 중...</p>
      </main>
    )
  }

  if (!option) {
    router.push(`/box/${boxId}`)
    return null
  }

  const content = parseBlocks(option.content)

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <Link href={`/box/${boxId}/option/${optionId}`} aria-label="뒤로가기" className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink active:bg-butter-tint">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">선택지 수정</h1>
      </header>

      <div className="flex-1 px-5 pt-1">
        <OptionForm
          boxId={boxId}
          initialName={option.name}
          initialContent={content}
          isPending={updateOption.isPending}
          submitLabel="수정하기"
          onSubmit={data => {
            updateOption.mutate(
              { name: data.name, content: data.content },
              { onSuccess: () => router.push(`/box/${boxId}/option/${optionId}`) }
            )
          }}
          onCancel={() => router.push(`/box/${boxId}/option/${optionId}`)}
        />
      </div>
    </main>
  )
}
