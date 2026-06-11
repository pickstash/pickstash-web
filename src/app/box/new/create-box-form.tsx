'use client'

import { useState } from 'react'
import { useCreateBox } from '@/hooks/use-boxes'
import { DeadlineBottomSheet } from '@/components/deadline-bottom-sheet'
import { defaultDeadline, formatKoreanDateTime } from '@/lib/utils'

export function CreateBoxForm() {
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [hasDeadline, setHasDeadline] = useState(false)
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const createBox = useCreateBox()

  function handleDeadlineCheck(checked: boolean) {
    setHasDeadline(checked)
    if (checked && !deadline) {
      setDeadline(defaultDeadline())
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    const deadlineDate = hasDeadline && deadline ? deadline : defaultDeadline()
    createBox.mutate({
      title: title.trim(),
      memo: memo.trim() || undefined,
      deadline_at: deadlineDate.toISOString(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-5 py-6 gap-5">
      <div>
        <label className="block text-sm text-gray-500 mb-1.5">상자 이름 *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="예) 해외여행 어디로 갈까?"
          maxLength={50}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1.5">메모</label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="자유롭게 메모해보세요"
          maxLength={200}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={hasDeadline}
            onChange={e => handleDeadlineCheck(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">마감 기한 설정</span>
        </label>

        {hasDeadline && deadline && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700"
          >
            {formatKoreanDateTime(deadline.toISOString())}까지
          </button>
        )}
      </div>

      {createBox.isError && (
        <p className="text-sm text-red-500">상자 생성에 실패했어요. 다시 시도해주세요.</p>
      )}

      <div className="mt-auto">
        <button
          type="submit"
          disabled={!title.trim() || createBox.isPending}
          className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold disabled:opacity-40 active:opacity-80"
        >
          {createBox.isPending ? '생성 중...' : '상자 만들기'}
        </button>
      </div>

      <DeadlineBottomSheet
        open={sheetOpen}
        defaultValue={deadline ?? undefined}
        onClose={() => setSheetOpen(false)}
        onConfirm={date => {
          setDeadline(date)
          setSheetOpen(false)
        }}
      />
    </form>
  )
}
