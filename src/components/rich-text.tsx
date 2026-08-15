import type { ReactNode } from 'react'
import { parseRichDoc, type RichTextNode } from '@/lib/domain/option-content'

interface RichTextProps {
  text: string
  className?: string
  /** 주어지면 체크박스가 클릭 가능해진다(문서 전체 기준 체크항목 인덱스 전달). 없으면 상태만 표시(읽기전용). */
  onToggleCheck?: (checkIndex: number) => void
}

function renderInlines(nodes: RichTextNode[] | undefined) {
  return (nodes ?? []).map((n, i) => {
    // 굵게만 있으면 기울임 검사를 안 하고 바로 반환했던 게 버그 — 굵게+기울임을 같이 쓴 글자는
    // 저장 후 기울임이 사라져 보였다(<strong>만 씌우고 <em>은 그냥 버려짐). 두 마크를 겹쳐 씌운다.
    let node: ReactNode = n.text
    if (n.marks?.some(m => m.type === 'italic')) node = <em>{node}</em>
    if (n.marks?.some(m => m.type === 'bold')) node = <strong>{node}</strong>
    return <span key={i}>{node}</span>
  })
}

/** 선택지 글 블록(ProseMirror 문서: 굵게·기울임·글머리·체크박스)을 렌더링한다. */
export function RichText({ text, className, onToggleCheck }: RichTextProps) {
  const doc = parseRichDoc(text)
  let checkIndex = 0

  return (
    <div className={className}>
      {doc.content.map((block, i) => {
        if (block.type === 'paragraph') {
          const isEmpty = !block.content || block.content.length === 0
          // 빈 문단(엔터로 만든 빈 줄)을 공백 문자로 채우면 브라우저가 "내용 없는 공백"으로 보고
          // 줄 높이를 0으로 접어버려 편집기(브라우저가 <br>로 렌더)와 달리 뷰에서 사라져 보였다.
          return <p key={i}>{isEmpty ? <br /> : renderInlines(block.content)}</p>
        }
        if (block.type === 'bulletList') {
          return (
            <ul key={i} className="list-disc space-y-0.5 pl-5">
              {block.content.map((item, j) => (
                <li key={j}>{item.content?.map((p, k) => <span key={k}>{renderInlines(p.content)}</span>)}</li>
              ))}
            </ul>
          )
        }
        // taskList
        return (
          <ul key={i} className="space-y-1.5">
            {block.content.map((item, j) => {
              const index = checkIndex++
              const checked = !!item.attrs?.checked
              return (
                <li key={j} className="flex items-start gap-2">
                  <button
                    type="button"
                    disabled={!onToggleCheck}
                    onClick={e => {
                      e.stopPropagation()
                      onToggleCheck?.(index)
                    }}
                    aria-label={checked ? '체크 해제' : '체크'}
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] ${
                      checked ? 'border-ink bg-ink' : 'border-line bg-paper'
                    } ${onToggleCheck ? 'active:opacity-70' : ''}`}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className={checked ? 'text-ink-faint line-through' : ''}>
                    {item.content?.map((p, k) => <span key={k}>{renderInlines(p.content)}</span>)}
                  </span>
                </li>
              )
            })}
          </ul>
        )
      })}
    </div>
  )
}
