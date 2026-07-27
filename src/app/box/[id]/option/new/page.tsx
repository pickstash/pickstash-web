'use client'

import { use } from 'react'
import Link from 'next/link'
import { OptionForm } from '@/components/option-form'
import { useCreateOption } from '@/hooks/use-options'

export default function NewOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: boxId } = use(params)
  const createOption = useCreateOption(boxId)

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3">
        <Link href={`/box/${boxId}`} aria-label="뒤로가기" className="-ml-2 flex h-9 w-9 items-center justify-center rounded-full text-ink active:bg-butter-tint">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">선택지 추가</h1>
      </header>

      <div className="flex-1 px-5 pt-1">
        <OptionForm
          boxId={boxId}
          isPending={createOption.isPending}
          submitLabel="선택지 추가하기"
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
