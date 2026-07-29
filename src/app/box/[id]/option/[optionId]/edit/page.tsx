'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useOption, useUpdateOption } from '@/hooks/use-options'
import { OptionForm } from '@/components/option-form'
import { PageHeader } from '@/components/page-header'
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
    router.replace(`/box/${boxId}`)
    return null
  }

  const content = parseBlocks(option.content)

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="선택지 수정" fallbackHref={`/box/${boxId}/option/${optionId}`} />

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
              { onSuccess: () => router.replace(`/box/${boxId}/option/${optionId}`) }
            )
          }}
          onCancel={() => router.replace(`/box/${boxId}/option/${optionId}`)}
        />
      </div>
    </main>
  )
}
