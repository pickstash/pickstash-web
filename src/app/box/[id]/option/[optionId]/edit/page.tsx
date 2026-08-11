'use client'

import { use } from 'react'
import { useNav } from '@/lib/nav/nav'
import { useBox } from '@/hooks/use-boxes'
import { useOption, useOptions, useUpdateOption } from '@/hooks/use-options'
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
  const { data: box } = useBox(boxId)
  const { data: options = [] } = useOptions(boxId)
  const checklist = box?.mode === 'checklist'
  const existingGroups = Array.from(
    new Set(options.map(o => o.group_label?.trim()).filter((g): g is string => !!g && g !== option?.group_label?.trim())),
  )

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
      <PageHeader title={checklist ? '항목 수정' : '선택지 수정'} fallbackHref={`/box/${boxId}/option/${optionId}`} />

      <div className="flex-1 px-5 pt-1">
        <OptionForm
          boxId={boxId}
          initialName={option.name}
          initialContent={content}
          isPending={updateOption.isPending}
          submitLabel="수정하기"
          checklist={checklist}
          existingGroups={existingGroups}
          initialGroupLabel={option.group_label}
          onSubmit={data => {
            updateOption.mutate(
              { name: data.name, content: data.content, group_label: data.group_label },
              { onSuccess: () => nav.replace(`/box/${boxId}/option/${optionId}`) }
            )
          }}
          onCancel={() => nav.replace(`/box/${boxId}/option/${optionId}`)}
        />
      </div>
    </main>
  )
}
