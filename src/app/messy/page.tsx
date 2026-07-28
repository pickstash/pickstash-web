import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxCard } from '@/components/box-card'
import { PageHeader } from '@/components/page-header'
import { AppDrawer } from '@/components/app-drawer'
import type { Box } from '@/lib/api/boxes'

export default async function MessyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawBoxes }, { data: participations }, { data: favs }, { data: profile }] = await Promise.all([
    supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .is('closed_at', null)
      .order('updated_at', { ascending: false }),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', user.id),
    supabase.from('favorites').select('box_id').eq('user_id', user.id),
    supabase.from('profiles').select('nickname').eq('id', user.id).single(),
  ])

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))
  type RawBox = Box & { box_participants: { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }[] }
  const boxes = (rawBoxes ?? []) as unknown as RawBox[]

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="어질러진 창고" right={<AppDrawer nickname={profile?.nickname ?? ''} />} />

      <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-soft">
        아직 정리 중인 상자들이에요.<br/>후보를 더하고 투표해서 하나씩 결정해보세요.
      </p>

      <div className="flex-1 space-y-2.5 px-5 pb-28">
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
            <p className="text-[13.5px] font-bold text-ink">아직 상자가 없어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">고민이 생기면 상자에 담아보세요!</p>
          </div>
        )}
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-cream px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
        <Link href="/box/new" className="block">
          <button className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80">
            새로운 상자 만들기
          </button>
        </Link>
      </div>
    </main>
  )
}
