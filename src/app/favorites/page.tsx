import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxCard } from '@/components/box-card'
import { getWinner, buildOptionVoteSummaries } from '@/lib/domain/winner'
import { getBoxStatus } from '@/lib/domain/box-status'
import type { Box } from '@/lib/api/boxes'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawFavs } = await supabase
    .from('favorites')
    .select(`box_id, boxes(*, box_participants(user_id), options(id, name, votes(vote_type, round)))`)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  type FavBox = Box & {
    box_participants: { user_id: string }[]
    options: { id: string; name: string; votes: { vote_type: string; round: number }[] }[]
  }

  const boxes = (rawFavs ?? [])
    .map(f => f.boxes)
    .filter(Boolean) as unknown as FavBox[]

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href="/" className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">즐겨찾는 창고</h1>
      </header>

      <p className="px-5 py-4 text-sm text-gray-400">
        다시 꺼내보고 싶은 상자들이 모였어요.
      </p>

      <div className="flex-1 px-5 space-y-3 pb-10">
        {boxes.length > 0 ? (
          boxes.map(box => {
            const status = getBoxStatus(box)
            const isDone = status === 'RESOLVED' || status === 'EXPIRED'
            const winner = isDone ? getWinner(buildOptionVoteSummaries(box.options, box.current_round)) : null
            return (
              <BoxCard
                key={box.id}
                box={box}
                participantCount={box.box_participants.length}
                winnerName={winner}
                isFavorite
              />
            )
          })
        ) : (
          <div className="text-center py-20 text-sm text-gray-400">즐겨찾는 상자가 없어요.</div>
        )}
      </div>
    </main>
  )
}
