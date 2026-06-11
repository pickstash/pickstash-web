'use client'

import { use } from 'react'
import Link from 'next/link'
import { OptionForm } from '@/components/option-form'
import { useCreateOption } from '@/hooks/use-options'

export default function NewOptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: boxId } = use(params)
  const createOption = useCreateOption(boxId)

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href={`/box/${boxId}`} className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">선택지 추가</h1>
      </header>

      <div className="flex-1 px-5 py-6">
        <OptionForm
          isPending={createOption.isPending}
          submitLabel="선택지 추가하기"
          onSubmit={data =>
            createOption.mutate({
              box_id: boxId,
              name: data.name,
              summary: data.summary,
              memo: data.memo || undefined,
            })
          }
          onCancel={() => history.back()}
        />
      </div>
    </main>
  )
}
