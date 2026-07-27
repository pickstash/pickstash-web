import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxCard } from '@/components/box-card'
import { PageHeader } from '@/components/page-header'
import type { Box } from '@/lib/api/boxes'

// 폴더 뷰 — 주제별 상자 묶음(§3-7). 개인별: 내가 이 폴더에 넣은 상자만. 상태(어질러진/정리된) 무관.
export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 폴더는 본인 것만 조회 가능(RLS) — 없거나 남의 폴더면 notFound
  const { data: folder } = await supabase.from('folders').select('id, name').eq('id', id).single()
  if (!folder) notFound()

  // 내가 이 폴더에 넣은 상자 id (box_folders RLS: 본인 행만)
  const { data: filings } = await supabase.from('box_folders').select('box_id').eq('folder_id', id)
  const boxIds = (filings ?? []).map(f => f.box_id)

  const [{ data: rawBoxes }, { data: participations }, { data: favs }] = await Promise.all([
    supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .in('id', boxIds)
      .order('updated_at', { ascending: false }),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', user.id),
    supabase.from('favorites').select('box_id').eq('user_id', user.id),
  ])

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))
  type RawBox = Box & { box_participants: { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }[] }
  const boxes = (rawBoxes ?? []) as unknown as RawBox[]

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title={folder.name} />

      <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-soft">
        {folder.name} 폴더에 모아둔 상자예요.
      </p>

      <div className="flex-1 space-y-2.5 px-5 pb-10">
        {boxes.length > 0 ? (
          boxes.map(box => (
            <BoxCard
              key={box.id}
              box={box}
              participants={box.box_participants}
              isNew={new Date(box.updated_at) > new Date(lastSeenMap.get(box.id) ?? 0)}
              isFavorite={favoriteSet.has(box.id)}
            />
          ))
        ) : (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">이 폴더는 비어 있어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">상자 상세의 메뉴에서 이 폴더로 넣어보세요.</p>
          </div>
        )}
      </div>
    </main>
  )
}
