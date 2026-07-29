'use client'

import { use } from 'react'
import { OptionForm } from '@/components/option-form'
import { PageHeader } from '@/components/page-header'
import { useCreateOption } from '@/hooks/use-options'

export default function NewOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: boxId } = use(params)
  const createOption = useCreateOption(boxId)

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="선택지 추가" fallbackHref={`/box/${boxId}`} />

      <div className="flex-1 px-5 pt-1">
        <OptionForm
          boxId={boxId}
          isPending={createOption.isPending}
          submitLabel="선택지 추가하기"
          offerClipboardLink
          onSubmit={data =>
            createOption.mutate({
              box_id: boxId,
              name: data.name,
              content: data.content,
            })
          }
          onCancel={() => history.back()}
        />
      </div>
    </main>
  )
}
