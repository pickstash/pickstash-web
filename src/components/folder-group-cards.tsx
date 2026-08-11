'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { loadFolders } from '@/lib/api/folders-list'
import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import type { FolderCard } from '@/app/folders/folders-client'

// 홈의 서랍 = "그룹 카드"(멤버 아바타 + 상자수). 공유폴더(자동초대 그룹)임을 드러낸다.
// 데이터는 folders-list 로더(['folders-page']) 재사용 — folder-view 변경과 무효화 키 공유.
function MemberAvatars({ members, max = 3 }: { members: FolderCard['members']; max?: number }) {
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map(m => (
        <div key={m.id} className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-paper bg-butter-tint text-[8px] font-bold text-ink">
          {m.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            m.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-paper bg-cream text-[8px] font-extrabold text-ink-soft">+{extra}</div>
      )}
    </div>
  )
}

export function FolderGroupCards() {
  const { data } = useQuery({
    queryKey: ['folders-page'],
    queryFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('세션이 없어요')
      return loadFolders(supabase, user.id)
    },
    refetchOnMount: 'always',
  })
  const cards = data?.cards ?? []

  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 px-5">
        <Icon name="folder" size={14} />
        <h2 className="text-[13px] font-extrabold text-ink">서랍</h2>
      </div>

      <div className="flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map(f => {
          const shared = f.members.length > 1
          return (
            <AppLink
              key={f.id}
              href={`/folder/${f.id}`}
              className="flex h-[76px] w-[150px] shrink-0 flex-col justify-between rounded-[16px] border border-[#ECEADC] bg-paper p-3 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40"
            >
              <div className="flex min-w-0 items-center gap-1">
                <span className="text-ink-faint">#</span>
                <span className="truncate text-[13px] font-extrabold text-ink">{f.name}</span>
              </div>
              <div className="flex items-center justify-between">
                {shared ? (
                  <MemberAvatars members={f.members} />
                ) : (
                  <span className="text-[10.5px] font-semibold text-ink-faint">혼자 쓰는 서랍</span>
                )}
                <span className="text-[11px] font-bold tabular-nums text-ink-soft">상자 {f.boxCount}</span>
              </div>
            </AppLink>
          )
        })}

        <AppLink
          href="/folders"
          className="flex h-[76px] w-[110px] shrink-0 flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-[#D9D6C2] text-[12px] font-bold text-ink-soft active:bg-cream"
        >
          <Icon name="plus" size={16} strokeWidth={2.4} />
          새 서랍
        </AppLink>
      </div>
    </section>
  )
}
