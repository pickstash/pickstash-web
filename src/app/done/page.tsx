import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxCard } from '@/components/box-card'
import { PageHeader } from '@/components/page-header'
import { AppDrawer } from '@/components/app-drawer'
import type { Box } from '@/lib/api/boxes'

export default async function DonePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawBoxes }, { data: participations }, { data: favs }, { data: profile }] = await Promise.all([
    supabase
      .from('boxes')
      .select(`*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, name, decided_at)`)
      .not('closed_at', 'is', null)
      .order('updated_at', { ascending: false }),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', user.id),
    supabase.from('favorites').select('box_id').eq('user_id', user.id),
    supabase.from('profiles').select('nickname').eq('id', user.id).single(),
  ])

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))

  type RawBox = Box & {
    box_participants: { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }[]
    options: { id: string; name: string; decided_at: string | null }[]
  }

  const boxes = (rawBoxes ?? []) as unknown as RawBox[]

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="정리된 창고" right={<AppDrawer nickname={profile?.nickname ?? ''} />} />

      <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-soft">
        결정이 끝난 상자들이 기록으로 남아있어요.
      </p>

      <div className="flex-1 space-y-2.5 px-5 pb-10">
        {boxes.length > 0 ? (
          boxes.map(box => {
            const decided = box.options.filter(o => o.decided_at)
            const winnerName = decided.length ? decided.map(o => o.name).join(', ') : null
            return (
              <BoxCard
                key={box.id}
                box={box}
                participants={box.box_participants}
                winnerName={winnerName}
                isNew={new Date(box.updated_at) > new Date(lastSeenMap.get(box.id) ?? 0)}
                isFavorite={favoriteSet.has(box.id)}
              />
            )
          })
        ) : (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">아직 정리된 상자가 없어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">첫 결정을 내려보세요!</p>
          </div>
        )}
      </div>
    </main>
  )
}
