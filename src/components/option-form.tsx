'use client'

import { useState } from 'react'
import type { SummaryItem } from '@/lib/api/options'

interface OptionFormProps {
  initialName?: string
  initialSummary?: SummaryItem[]
  initialMemo?: string
  initialLinks?: string[]
  isPending?: boolean
  onSubmit: (data: {
    name: string
    summary: SummaryItem[]
    memo: string
    links: string[]
  }) => void
  onCancel?: () => void
  submitLabel?: string
}

export function OptionForm({
  initialName = '',
  initialSummary = [],
  initialMemo = '',
  initialLinks = [],
  isPending,
  onSubmit,
  onCancel,
  submitLabel = '저장',
}: OptionFormProps) {
  const [name, setName] = useState(initialName)
  const [summaryItems, setSummaryItems] = useState<string[]>(
    initialSummary.length > 0
      ? initialSummary.sort((a, b) => a.order - b.order).map(s => s.text)
      : ['']
  )
  const [memo, setMemo] = useState(initialMemo)
  const [links, setLinks] = useState<string[]>(
    initialLinks.length > 0 ? initialLinks : ['']
  )

  function addSummaryItem() {
    setSummaryItems(prev => [...prev, ''])
  }

  function updateSummaryItem(index: number, value: string) {
    setSummaryItems(prev => prev.map((item, i) => (i === index ? value : item)))
  }

  function removeSummaryItem(index: number) {
    setSummaryItems(prev => prev.filter((_, i) => i !== index))
  }

  function addLink() {
    setLinks(prev => [...prev, ''])
  }

  function updateLink(index: number, value: string) {
    setLinks(prev => prev.map((item, i) => (i === index ? value : item)))
  }

  function removeLink(index: number) {
    setLinks(prev => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const summary: SummaryItem[] = summaryItems
      .map((text, i) => ({ text: text.trim(), order: i }))
      .filter(s => s.text.length > 0)

    const validLinks = links.map(l => l.trim()).filter(Boolean)

    onSubmit({ name: name.trim(), summary, memo: memo.trim(), links: validLinks })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 이름 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
          선택지 이름 <span className="text-tomato">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          placeholder="선택지 이름을 입력하세요"
          className="w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none focus:ring-[3px] focus:ring-butter-tint"
          required
        />
      </div>

      {/* 요약 항목 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">요약 항목</label>
        <div className="space-y-2">
          {summaryItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={e => updateSummaryItem(i, e.target.value)}
                placeholder={`항목 ${i + 1}`}
                maxLength={100}
                className="flex-1 rounded-field border-[1.5px] border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
              />
              {summaryItems.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSummaryItem(i)}
                  className="shrink-0 p-1 text-ink-faint"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {summaryItems.length < 10 && (
          <button
            type="button"
            onClick={addSummaryItem}
            className="mt-2 text-xs font-semibold text-ink-soft"
          >
            + 항목 추가
          </button>
        )}
      </div>

      {/* 메모 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">메모</label>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="선택지에 대한 메모를 입력하세요"
          className="w-full resize-none rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
        />
      </div>

      {/* 링크 */}
      <div>
        <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">링크</label>
        <div className="space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="url"
                value={link}
                onChange={e => updateLink(i, e.target.value)}
                placeholder="https://"
                className="flex-1 rounded-field border-[1.5px] border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
              />
              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="shrink-0 p-1 text-ink-faint"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {links.length < 5 && (
          <button
            type="button"
            onClick={addLink}
            className="mt-2 text-xs font-semibold text-ink-soft"
          >
            + 링크 추가
          </button>
        )}
      </div>

      {/* 버튼 */}
      <div className="space-y-2 pt-2">
        <button
          type="submit"
          disabled={isPending || !name.trim()}
          className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
        >
          {isPending ? '저장 중...' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-field border border-line py-3.5 text-sm font-bold text-ink-soft"
          >
            취소
          </button>
        )}
      </div>
    </form>
  )
}
