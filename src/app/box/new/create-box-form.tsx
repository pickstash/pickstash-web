'use client'

import { useState } from 'react'
import { useCreateBox } from '@/hooks/use-boxes'
import { DeadlineBottomSheet } from '@/components/deadline-bottom-sheet'
import { Icon } from '@/components/icon'
import { takePendingBoxFolder } from '@/lib/nav/pending-box-folder'
import { defaultDeadline, formatKoreanDateTime } from '@/lib/utils'
import type { DecisionMode } from '@/lib/api/boxes'

const MODES: { value: DecisionMode; label: string; sub: string }[] = [
  { value: 'manual', label: '직접 정하기', sub: '원할 때 직접 골라 정해요 (안 정하고 모아두기만 해도 돼요)' },
  { value: 'auto_deadline', label: '마감 투표', sub: '마감 때 좋아요 최다가 자동으로 정해져요' },
]

export function CreateBoxForm() {
  const [title, setTitle] = useState('')
  const [memo, setMemo] = useState('')
  const [mode, setMode] = useState<DecisionMode>('manual')
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  // 서랍 상세에서 넘어왔으면 그 서랍에 바로 담아 만든다(1회성 소비).
  const [pendingFolder] = useState(() => takePendingBoxFolder())

  const createBox = useCreateBox()

  const needsDeadline = mode === 'auto_deadline'
  const canSubmit = !!title.trim() && (!needsDeadline || !!deadline)

  function handleSelectMode(next: DecisionMode) {
    setMode(next)
    if (next === 'auto_deadline' && !deadline) setDeadline(defaultDeadline())
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    createBox.mutate({
      input: {
        title: title.trim(),
        memo: memo.trim() || undefined,
        decision_mode: mode,
        deadline_at: needsDeadline && deadline ? deadline.toISOString() : null,
      },
      folderId: pendingFolder?.id,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-5 py-6">
      {pendingFolder && (
        <div className="flex items-center gap-1.5 rounded-field bg-butter-tint px-3.5 py-2.5 text-[12.5px] font-bold text-ink">
          <Icon name="folder" size={14} className="shrink-0 text-ink-soft" />
          <span className="truncate">‘{pendingFolder.name}’ 서랍에 담겨요</span>
        </div>
      )}
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

      {/* 결정 방식 */}
      <div>
        <label className="mb-2 block text-[13px] font-semibold text-ink-soft">결정 방식</label>
        <div className="space-y-2">
          {MODES.map(m => {
            const active = mode === m.value
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => handleSelectMode(m.value)}
                className={`flex w-full items-start gap-2.5 rounded-field border-[1.5px] px-4 py-3 text-left transition-colors ${
                  active ? 'border-butter-dark bg-butter-tint' : 'border-line bg-paper'
                }`}
              >
                <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${active ? 'border-butter-dark bg-butter' : 'border-[#C9C7B6]'}`}>
                  {active && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-ink">{m.label}</span>
                  <span className="block text-[12px] text-ink-soft">{m.sub}</span>
                </span>
              </button>
            )
          })}
        </div>

        {needsDeadline && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="mt-2 w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-left text-sm text-ink"
          >
            {deadline ? `${formatKoreanDateTime(deadline.toISOString())}까지` : '마감일시 선택'}
          </button>
        )}
      </div>

      {createBox.isError && (
        <p className="text-sm text-tomato">상자 생성에 실패했어요. 다시 시도해주세요.</p>
      )}

      <div className="mt-auto">
        <button
          type="submit"
          disabled={!canSubmit || createBox.isPending}
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
