'use client'

import type { ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import { parseRichDoc } from '@/lib/domain/option-content'

interface RichTextEditorProps {
  /** ProseMirror 문서를 직렬화한 JSON 문자열(레거시 평문도 허용 — parseRichDoc이 폴백). */
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  label,
  className = '',
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      // 클릭해도 에디터 포커스(선택 영역)를 잃지 않게 — 안 하면 서식이 잘못된 위치에 적용된다.
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-7 w-7 items-center justify-center rounded-[8px] border-[1.5px] text-[12px] text-ink disabled:opacity-40 ${
        active ? 'border-butter-dark bg-butter-tint' : 'border-line active:bg-cream'
      } ${className}`}
    >
      {children}
    </button>
  )
}

/**
 * 애플 메모장처럼 타이핑하는 즉시 서식이 반영되는 실시간 리치텍스트 에디터(contentEditable, Tiptap).
 * 굵게·기울임·글머리·체크박스만 지원(§7-6 019, 최소 서식). 저장 형식은 ProseMirror JSON 문자열.
 */
export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        orderedList: false,
        strike: false,
        underline: false,
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
    ],
    content: parseRichDoc(value),
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
    editorProps: {
      attributes: {
        class: 'option-editor min-h-[76px] text-sm text-ink focus:outline-none [&_ul]:my-1 [&_p]:my-0.5',
        'data-placeholder': placeholder ?? '',
      },
    },
    // Next.js SSR 하이드레이션 불일치 방지(Tiptap 권장) — 클라이언트 마운트 후에만 렌더.
    immediatelyRender: false,
  })

  const state = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? { bold: editor.isActive('bold'), italic: editor.isActive('italic'), bullet: editor.isActive('bulletList'), check: editor.isActive('taskList') }
        : { bold: false, italic: false, bullet: false, check: false },
  }) ?? { bold: false, italic: false, bullet: false, check: false }

  return (
    <div>
      <div className="mb-1.5 flex gap-1">
        <ToolbarButton label="굵게" disabled={!editor} active={state.bold} onClick={() => editor?.chain().focus().toggleBold().run()} className="font-bold">
          B
        </ToolbarButton>
        <ToolbarButton label="기울임" disabled={!editor} active={state.italic} onClick={() => editor?.chain().focus().toggleItalic().run()} className="italic">
          I
        </ToolbarButton>
        <ToolbarButton
          label="글머리 목록"
          disabled={!editor}
          active={state.bullet}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className="text-[14px]"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          label="체크박스"
          disabled={!editor}
          active={state.check}
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          className="text-[11px]"
        >
          ☑
        </ToolbarButton>
      </div>
      <div className="w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 focus-within:border-butter-dark focus-within:ring-[3px] focus-within:ring-butter-tint">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
