'use client'

import { useState } from 'react'
import { toDateInput, toTimeInput, defaultDeadline } from '@/lib/utils'

interface DeadlineBottomSheetProps {
  open: boolean
  defaultValue?: Date
  onClose: () => void
  onConfirm: (date: Date) => void
  /** 제공되면 "마감 없음으로 변경" 액션을 노출한다 (마감일 편집 시). */
  onClear?: () => void
}

export function DeadlineBottomSheet({ open, ...props }: DeadlineBottomSheetProps) {
  // 열릴 때만 본문을 마운트해 useState 초기값으로 시드한다. 열려 있는 동안 부모 리렌더
  // (예: 저장 중 isPending)로는 사용자가 고른 값을 이전 마감시간으로 덮어쓰지 않는다.
  if (!open) return null
  return <DeadlineSheetBody {...props} />
}

function DeadlineSheetBody({ defaultValue, onClose, onConfirm, onClear }: Omit<DeadlineBottomSheetProps, 'open'>) {
  const initial = defaultValue ?? defaultDeadline()
  const [date, setDate] = useState(() => toDateInput(initial))
  const [time, setTime] = useState(() => toTimeInput(initial))
  const [error, setError] = useState('')

  function handleSetNow(checked: boolean) {
    if (checked) {
      const now = new Date()
      setDate(toDateInput(now))
      setTime(toTimeInput(now))
      setError('')
    }
  }

  function handleConfirm() {
    if (!date || !time) {
      setError('날짜와 시간을 선택해주세요.')
      return
    }
    const selected = new Date(`${date}T${time}`)
    if (isNaN(selected.getTime())) {
      setError('올바른 날짜/시간을 입력해주세요.')
      return
    }
    if (selected <= new Date()) {
      setError('현재 시간 이후로 설정해주세요.')
      return
    }
    onConfirm(selected)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-extrabold tracking-tight text-ink">마감일시 설정</h3>
          <button onClick={onClose} className="text-[13px] text-ink-faint">닫기</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">날짜</label>
            <input
              type="date"
              value={date}
              min={toDateInput(new Date())}
              onChange={e => { setDate(e.target.value); setError('') }}
              className="w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-3 text-sm text-ink focus:border-butter-dark focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">시간</label>
            <input
              type="time"
              value={time}
              onChange={e => { setTime(e.target.value); setError('') }}
              className="w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-3 text-sm text-ink focus:border-butter-dark focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              onChange={e => handleSetNow(e.target.checked)}
              className="h-[17px] w-[17px] rounded accent-ink"
            />
            <span className="text-sm text-ink-soft">현재 시간으로 변경</span>
          </label>

          {error && <p className="text-[12.5px] font-semibold text-tomato">{error}</p>}
        </div>

        <button
          onClick={handleConfirm}
          className="mt-6 w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
        >
          확인
        </button>

        {onClear && (
          <button
            onClick={onClear}
            className="mt-2.5 w-full py-2 text-[13px] font-semibold text-ink-soft active:text-ink"
          >
            마감 없이 진행하기
          </button>
        )}
      </div>
    </div>
  )
}
