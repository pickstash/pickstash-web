'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useFolders, useCreateFolder } from '@/hooks/use-folders'
import { Icon } from '@/components/icon'
import type { Folder } from '@/lib/api/folders'

/**
 * 메인의 폴더(주제) 칩 줄 — 가로 스크롤. 내 폴더 → /folder/[id], + 새 폴더 인라인 생성.
 * SSR로 받은 initialFolders를 시드로 써서 첫 페인트 깜빡임을 없앤다.
 */
export function FolderChips({ initialFolders }: { initialFolders: Folder[] }) {
  const { data: folders = initialFolders } = useFolders()
  const createFolder = useCreateFolder()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  // 폴더가 없어도 섹션은 유지 — 최소 '+ 새 폴더' 버튼으로 생성 유도(숨기지 않음).

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) {
      setAdding(false)
      return
    }
    createFolder.mutate(trimmed, {
      onSuccess: () => {
        setName('')
        setAdding(false)
      },
    })
  }

  return (
    <section className="pt-5">
      <div className="mb-2 flex items-center gap-1.5 px-5">
        <Icon name="folder" size={14} />
        <h2 className="text-[13px] font-extrabold text-ink">폴더</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {folders.map(folder => (
          <Link
            key={folder.id}
            href={`/folder/${folder.id}`}
            className="flex shrink-0 items-center gap-1 rounded-full border border-[#ECEADC] bg-paper px-3.5 py-2 text-[12.5px] font-bold text-ink active:bg-butter-tint/50"
          >
            <span className="text-ink-faint">#</span>
            {folder.name}
          </Link>
        ))}

        {adding ? (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-butter-dark bg-butter-tint px-3 py-1.5">
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') { setName(''); setAdding(false) }
              }}
              onBlur={submit}
              placeholder="폴더 이름"
              maxLength={20}
              className="w-24 bg-transparent text-[12.5px] font-bold text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#D9D6C2] px-3.5 py-2 text-[12.5px] font-bold text-ink-soft active:bg-cream"
          >
            <Icon name="plus" size={13} strokeWidth={2.4} />
            새 폴더
          </button>
        )}
      </div>
    </section>
  )
}
