'use client'

import { useRef, useState } from 'react'
import { parseMentionBody, mentionToken } from '@/lib/domain/mentions'

interface Participant {
  id: string
  nickname: string
  avatar_url: string | null
}

interface MentionSpan {
  start: number
  end: number
  userId: string
  nickname: string
}

interface CommentComposerProps {
  participants: Participant[]
  currentUserId: string
  initialBody?: string
  initialMention?: { id: string; nickname: string }
  placeholder?: string
  submitLabel?: string
  autoFocus?: boolean
  isPending?: boolean
  onSubmit: (body: string) => void
  onCancel?: () => void
  /** 새 댓글 입력창처럼 인풋+버튼을 한 줄로. reply/edit은 false(취소·등록을 아래 줄에). */
  compact?: boolean
}

function toEditable(body: string): { text: string; spans: MentionSpan[] } {
  const segments = parseMentionBody(body)
  let text = ''
  const spans: MentionSpan[] = []
  for (const seg of segments) {
    if (seg.type === 'text') {
      text += seg.value
    } else {
      const start = text.length
      const visible = `@${seg.nickname}`
      text += visible
      spans.push({ start, end: start + visible.length, userId: seg.userId, nickname: seg.nickname })
    }
  }
  return { text, spans }
}

function initialState(initialBody?: string, initialMention?: { id: string; nickname: string }) {
  if (initialBody) return toEditable(initialBody)
  if (initialMention) {
    const visible = `@${initialMention.nickname} `
    return {
      text: visible,
      spans: [{ start: 0, end: visible.length - 1, userId: initialMention.id, nickname: initialMention.nickname }],
    }
  }
  return { text: '', spans: [] }
}

export function CommentComposer({
  participants,
  currentUserId,
  initialBody,
  initialMention,
  placeholder = '댓글을 입력하세요',
  submitLabel = '등록',
  autoFocus,
  isPending,
  onSubmit,
  onCancel,
  compact = false,
}: CommentComposerProps) {
  const init = useState(() => initialState(initialBody, initialMention))[0]
  const [text, setText] = useState(init.text)
  const [spans, setSpans] = useState<MentionSpan[]>(init.spans)
  const [dropdown, setDropdown] = useState<{ atIndex: number; query: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = dropdown
    ? participants
        .filter(p => p.id !== currentUserId)
        .filter(p => p.nickname.toLowerCase().includes(dropdown.query.toLowerCase()))
        .slice(0, 5)
    : []

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newText = e.target.value
    const cursor = e.target.selectionStart ?? newText.length

    const nextSpans = spans.filter(s => newText.slice(s.start, s.end) === `@${s.nickname}`)
    setSpans(nextSpans)
    setText(newText)

    const uptoCursor = newText.slice(0, cursor)
    const atIndex = uptoCursor.lastIndexOf('@')
    if (atIndex === -1) {
      setDropdown(null)
      return
    }
    const query = uptoCursor.slice(atIndex + 1)
    const insideCommittedSpan = nextSpans.some(s => atIndex >= s.start && atIndex < s.end)
    if (/\s/.test(query) || insideCommittedSpan) {
      setDropdown(null)
      return
    }
    setDropdown({ atIndex, query })
  }

  function selectMention(p: Participant) {
    if (!dropdown) return
    const before = text.slice(0, dropdown.atIndex)
    const after = text.slice(dropdown.atIndex + 1 + dropdown.query.length)
    const insertText = `@${p.nickname} `
    const newText = before + insertText + after
    const newSpan: MentionSpan = {
      start: before.length,
      end: before.length + insertText.length - 1,
      userId: p.id,
      nickname: p.nickname,
    }
    setSpans(prev => [...prev, newSpan])
    setText(newText)
    setDropdown(null)

    const pos = before.length + insertText.length
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(pos, pos)
      inputRef.current?.focus()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdown) return
    if (e.key === 'Escape') {
      e.preventDefault()
      setDropdown(null)
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault()
      selectMention(suggestions[0])
    }
  }

  function buildFinalBody(): string {
    const sorted = [...spans].sort((a, b) => a.start - b.start)
    let result = ''
    let cursor = 0
    for (const s of sorted) {
      if (s.start < cursor) continue
      result += text.slice(cursor, s.start)
      result += mentionToken(s.nickname, s.userId)
      cursor = s.end
    }
    result += text.slice(cursor)
    return result
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onSubmit(buildFinalBody())
  }

  const inputEl = (
    <input
      ref={inputRef}
      type="text"
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      maxLength={200}
      autoFocus={autoFocus}
      className="w-full min-w-0 rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
    />
  )

  return (
    <form onSubmit={handleSubmit} className={compact ? 'flex gap-2' : 'space-y-2'}>
      <div className="relative min-w-0 flex-1">
        {inputEl}
        {suggestions.length > 0 && (
          <div className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-[14px] border border-line bg-paper py-1 shadow-[0_8px_24px_rgba(42,42,39,0.16)]">
            {suggestions.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => selectMention(p)}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13px] font-semibold text-ink active:bg-cream"
              >
                <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full bg-butter-tint">
                  {p.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.avatar_url} alt={p.nickname} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-ink">
                      {p.nickname[0]}
                    </div>
                  )}
                </div>
                {p.nickname}
              </button>
            ))}
          </div>
        )}
      </div>

      {compact ? (
        <button
          type="submit"
          disabled={!text.trim() || isPending}
          className="shrink-0 rounded-field bg-ink px-4 py-2.5 text-sm font-bold text-cream disabled:opacity-50"
        >
          {submitLabel}
        </button>
      ) : (
        <div className="flex justify-end gap-1.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-field px-3 py-1.5 text-[12.5px] font-bold text-ink-faint active:bg-cream"
            >
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={!text.trim() || isPending}
            className="rounded-field bg-ink px-3.5 py-1.5 text-[12.5px] font-bold text-cream disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      )}
    </form>
  )
}
