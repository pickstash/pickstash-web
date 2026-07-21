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

    // 마감을 켜지 않으면 마감 없는 상자 (혼자 고민 보드 용도)
    createBox.mutate({
      title: title.trim(),
      memo: memo.trim() || undefined,
      deadline_at: hasDeadline && deadline ? deadline.toISOString() : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">상자 이름 *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="예) 해외여행 어디로 갈까?"
          maxLength={50}
          className="w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none focus:ring-[3px] focus:ring-butter-tint"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">메모</label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="자유롭게 메모해보세요"
          maxLength={200}
          rows={3}
          className="w-full resize-none rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none focus:ring-[3px] focus:ring-butter-tint"
        />
      </div>

      <div>
        <label className="mb-2 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={hasDeadline}
            onChange={e => handleDeadlineCheck(e.target.checked)}
            className="h-[17px] w-[17px] rounded accent-ink"
          />
          <span className="text-sm font-semibold text-ink">마감 기한 설정</span>
        </label>

        {hasDeadline && deadline ? (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-left text-sm text-ink"
          >
            {formatKoreanDateTime(deadline.toISOString())}까지
          </button>
        ) : (
          <p className="text-[12px] text-ink-faint">
            마감 없이 두면 혼자 고민을 정리하기 좋아요. 언제든 결정할 수 있어요.
          </p>
        )}
      </div>

      {createBox.isError && (
        <p className="text-sm text-tomato">상자 생성에 실패했어요. 다시 시도해주세요.</p>
      )}

      <div className="mt-auto">
        <button
          type="submit"
          disabled={!title.trim() || createBox.isPending}
          className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-40"
        >
          {createBox.isPending ? '만드는 중...' : '상자 만들기'}
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
