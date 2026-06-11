'use client'

import { useEffect, useState } from 'react'
import { toDateInput, toTimeInput, defaultDeadline } from '@/lib/utils'

interface DeadlineBottomSheetProps {
  open: boolean
  defaultValue?: Date
  onClose: () => void
  onConfirm: (date: Date) => void
}

export function DeadlineBottomSheet({ open, defaultValue, onClose, onConfirm }: DeadlineBottomSheetProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      const d = defaultValue ?? defaultDeadline()
      setDate(toDateInput(d))
      setTime(toTimeInput(d))
      setError('')
    }
  }, [open, defaultValue])

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl px-5 pt-5 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-gray-900">마감일시 설정</h3>
          <button onClick={onClose} className="text-sm text-gray-400">닫기</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              min={toDateInput(new Date())}
              onChange={e => { setDate(e.target.value); setError('') }}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1">시간</label>
            <input
              type="time"
              value={time}
              onChange={e => { setTime(e.target.value); setError('') }}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              onChange={e => handleSetNow(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">현재 시간으로 변경</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <button
          onClick={handleConfirm}
          className="mt-6 w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold active:opacity-80"
        >
          확인
        </button>
      </div>
    </div>
  )
}
