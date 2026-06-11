import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxCard } from '@/components/box-card'
import type { Box } from '@/lib/api/boxes'

export default async function MessyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()

  const [{ data: boxes }, { data: participations }, { data: favs }] = await Promise.all([
    supabase.from('boxes').select('*').is('closed_at', null).gte('deadline_at', now).order('updated_at', { ascending: false }),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', user.id),
    supabase.from('favorites').select('box_id').eq('user_id', user.id),
  ])

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href="/" className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">어질러진 창고</h1>
      </header>

      <p className="px-5 py-4 text-sm text-gray-400">
        아직 결정을 내리지 못한 상자들이에요. 마감 언저리 후보를 추가하고 결정을 도와줄 수 있어요.
      </p>

      <div className="flex-1 px-5 space-y-3 pb-10">
        {boxes && boxes.length > 0 ? (
          boxes.map(box => (
            <BoxCard
              key={box.id}
              box={box as Box}
              isNew={new Date((box as Box).updated_at) > new Date(lastSeenMap.get(box.id) ?? 0)}
              isFavorite={favoriteSet.has(box.id)}
            />
          ))
        ) : (
          <div className="text-center py-20 text-sm text-gray-400">아직 상자가 없어요.</div>
        )}
      </div>

      <div className="px-5 pb-10">
        <Link href="/box/new">
          <button className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold active:opacity-80">
            새로운 상자 만들기
          </button>
        </Link>
      </div>
    </main>
  )
}
