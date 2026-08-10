'use client'

import { use } from 'react'
import { OptionForm } from '@/components/option-form'
import { PageHeader } from '@/components/page-header'
import { useNav } from '@/lib/nav/nav'
import { useBox } from '@/hooks/use-boxes'
import { useOptions, useCreateOption } from '@/hooks/use-options'

export default function NewOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: boxId } = use(params)
  const nav = useNav()
  const createOption = useCreateOption(boxId)
  const { data: box } = useBox(boxId)
  const { data: options = [] } = useOptions(boxId)
  const checklist = box?.mode === 'checklist'
  // 이 상자에서 이미 쓰인 그룹 라벨(자동완성 칩용) — 첫 등장 순서, 중복 제거.
  const existingGroups = Array.from(new Set(options.map(o => o.group_label?.trim()).filter((g): g is string => !!g)))

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title={checklist ? '항목 추가' : '선택지 추가'} fallbackHref={`/box/${boxId}`} />

      <div className="flex-1 px-5 pt-1">
        <OptionForm
          boxId={boxId}
          isPending={createOption.isPending}
          submitLabel={checklist ? '항목 추가하기' : '선택지 추가하기'}
          offerClipboardLink
          checklist={checklist}
          existingGroups={existingGroups}
          onSubmit={data =>
            createOption.mutate({
              box_id: boxId,
              name: data.name,
              content: data.content,
              group_label: data.group_label,
            })
          }
          onCancel={() => nav.back()}
        />
      </div>
    </main>
  )
}
