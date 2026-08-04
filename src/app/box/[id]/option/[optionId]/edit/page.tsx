'use client'

import { use } from 'react'
import { useNav } from '@/lib/nav/nav'
import { useOption, useUpdateOption } from '@/hooks/use-options'
import { OptionForm } from '@/components/option-form'
import { PageHeader } from '@/components/page-header'
import { parseBlocks } from '@/lib/domain/option-content'
import { Spinner } from '@/components/spinner'

export default function EditOptionPage({
  params,
}: {
  params: Promise<{ id: string; optionId: string }>
}) {
  const { id: boxId, optionId } = use(params)
  const nav = useNav()
  const { data: option, isLoading } = useOption(optionId)
  const updateOption = useUpdateOption(optionId, boxId)

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </main>
    )
  }

  if (!option) {
    nav.replace(`/box/${boxId}`)
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
              { onSuccess: () => nav.replace(`/box/${boxId}/option/${optionId}`) }
            )
          }}
          onCancel={() => nav.replace(`/box/${boxId}/option/${optionId}`)}
        />
      </div>
    </main>
  )
}
