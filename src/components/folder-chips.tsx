'use client'

import { AppLink } from '@/lib/nav/nav'
import { useFolders } from '@/hooks/use-folders'
import { Icon } from '@/components/icon'
import type { Folder } from '@/lib/api/folders'

/**
 * 메인의 서랍(주제) 칩 줄 — 가로 스크롤. 내 서랍 → /folder/[id], + 새 서랍 → /folders(서랍 페이지에서 생성).
 * SSR로 받은 initialFolders를 시드로 써서 첫 페인트 깜빡임을 없앤다.
 */
export function FolderChips({ initialFolders }: { initialFolders: Folder[] }) {
  const { data: folders = initialFolders } = useFolders()

  // 서랍이 없어도 섹션은 유지 — 최소 '+ 새 서랍' 버튼으로 생성 유도(숨기지 않음).

  return (
    <section className="pt-5">
      <div className="mb-2 flex items-center gap-1.5 px-5">
        <Icon name="folder" size={14} />
        <h2 className="text-[13px] font-extrabold text-ink">서랍</h2>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {folders.map(folder => (
          <AppLink
            key={folder.id}
            href={`/folder/${folder.id}`}
            className="flex shrink-0 items-center gap-1 rounded-full border border-[#ECEADC] bg-paper px-3.5 py-2 text-[12.5px] font-bold text-ink active:bg-butter-tint/50"
          >
            <span className="text-ink-faint">#</span>
            {folder.name}
          </AppLink>
        ))}

        <AppLink
          href="/folders"
          className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#D9D6C2] px-3.5 py-2 text-[12.5px] font-bold text-ink-soft active:bg-cream"
        >
          <Icon name="plus" size={13} strokeWidth={2.4} />
          새 서랍
        </AppLink>
      </div>
    </section>
  )
}
