'use client'

import { useState } from 'react'
import { useCreateBox } from '@/hooks/use-boxes'
import { DeadlineBottomSheet } from '@/components/deadline-bottom-sheet'
import { Icon } from '@/components/icon'
import { takePendingBoxFolder } from '@/lib/nav/pending-box-folder'
import { takePendingBoxDraft } from '@/lib/nav/pending-box-draft'
import { defaultDeadline, formatKoreanDateTime } from '@/lib/utils'
import type { DecisionMode, BoxMode } from '@/lib/api/boxes'

const PURPOSES: { value: BoxMode; label: string; sub: string }[] = [
  { value: 'decide', label: '결정하기', sub: '투표로 정해요' },
  { value: 'checklist', label: '모아보기', sub: '리스트로 정리해요' },
]

const DECISION_MODES: { value: DecisionMode; label: string; sub: string }[] = [
  { value: 'manual', label: '직접 정하기', sub: '마감일 없이 아무때나 결정해요' },
  { value: 'auto_deadline', label: '마감 투표', sub: '마감 때 좋아요 최다가 자동으로 정해져요' },
]

export function CreateBoxForm() {
  // 홈 빈 상태 추천 템플릿에서 넘어왔으면 제목·종류를 미리 채운다(1회성 소비).
  const [draft] = useState(() => takePendingBoxDraft())
  const [title, setTitle] = useState(draft?.title ?? '')
  const [memo, setMemo] = useState('')
  const [purpose, setPurpose] = useState<BoxMode>(draft?.mode ?? 'decide')
  const [decisionMode, setDecisionMode] = useState<DecisionMode>('manual')
  const [checkable, setCheckable] = useState(false) // 모아보기에서 항목 체크 사용 여부(기본 꺼짐)
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  // 서랍 상세에서 넘어왔으면 그 서랍에 바로 담아 만든다(1회성 소비).
  const [pendingFolder] = useState(() => takePendingBoxFolder())

  const createBox = useCreateBox()

  const needsDeadline = purpose === 'decide' && decisionMode === 'auto_deadline'
  const canSubmit = !!title.trim() && (!needsDeadline || !!deadline)

  function handleSelectDecisionMode(next: DecisionMode) {
    setDecisionMode(next)
    if (next === 'auto_deadline' && !deadline) setDeadline(defaultDeadline())
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    createBox.mutate({
      input: {
        title: title.trim(),
        memo: memo.trim() || undefined,
        mode: purpose,
        decision_mode: decisionMode,
        deadline_at: needsDeadline && deadline ? deadline.toISOString() : null,
        checkable: purpose === 'checklist' ? checkable : undefined,
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

      {/* 목적: 결정형 / 체크형 — 생성 후 변경 불가 */}
      <div>
        <label className="mb-2 block text-[13px] font-semibold text-ink-soft">이 상자는 무엇을 위한 건가요?</label>
        <div className="grid grid-cols-2 gap-2">
          {PURPOSES.map(p => {
            const active = purpose === p.value
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPurpose(p.value)}
                className={`rounded-field border-[1.5px] px-3.5 py-3 text-left transition-colors ${
                  active ? 'border-butter-dark bg-butter-tint' : 'border-line bg-paper'
                }`}
              >
                <span className="block text-sm font-bold text-ink">{p.label}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-soft">{p.sub}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 항목 체크 사용 — 목적을 '모아보기'로 골랐을 때만. 기본 꺼짐(모아두는 게 본질, 체크는 선택) */}
      {purpose === 'checklist' && (
        <button
          type="button"
          onClick={() => setCheckable(v => !v)}
          aria-pressed={checkable}
          className="flex w-full items-center justify-between gap-3 rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-bold text-ink">항목별 체크박스 사용</span>
            <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">상자를 만든 이후에도 설정할 수 있어요</span>
          </span>
          <span className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checkable ? 'bg-ink' : 'bg-[#D9D6C2]'}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow-sm transition-all ${checkable ? 'left-[18px]' : 'left-0.5'}`} />
          </span>
        </button>
      )}

      {/* 결정 방식 — 목적을 '결정하기'로 골랐을 때만 노출 */}
      {purpose === 'decide' && (
        <div>
          <label className="mb-2 block text-[13px] font-semibold text-ink-soft">결정 방식</label>
          <div className="space-y-2">
            {DECISION_MODES.map(m => {
              const active = decisionMode === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => handleSelectDecisionMode(m.value)}
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
      )}

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
