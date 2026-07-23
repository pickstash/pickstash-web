import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxCard } from '@/components/box-card'
import { PageHeader } from '@/components/page-header'
import { getVoteResult, buildOptionVoteSummaries } from '@/lib/domain/winner'
import { getBoxStatus, isDoneStatus } from '@/lib/domain/box-status'
import type { Box } from '@/lib/api/boxes'

export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawFavs }, { data: participations }] = await Promise.all([
    supabase
      .from('favorites')
      .select(`box_id, boxes(*, box_participants(user_id), options(id, name, votes(vote_type, round)))`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', user.id),
  ])

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))

  type FavBox = Box & {
    box_participants: { user_id: string }[]
    options: { id: string; name: string; votes: { vote_type: string; round: number }[] }[]
  }

  const boxes = (rawFavs ?? [])
    .map(f => f.boxes)
    .filter(Boolean) as unknown as FavBox[]

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="즐겨찾는 창고" />

      <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-soft">
        다시 꺼내보고 싶은 상자들이 모였어요.
      </p>

      <div className="flex-1 space-y-2.5 px-5 pb-10">
        {boxes.length > 0 ? (
          boxes.map(box => {
            const isDone = isDoneStatus(getBoxStatus(box))
            const result = isDone
              ? getVoteResult(buildOptionVoteSummaries(box.options, box.current_round))
              : null
            return (
              <BoxCard
                key={box.id}
                box={box}
                participantCount={box.box_participants.length}
                winnerName={result?.winner ?? null}
                coLeaderCount={result?.coLeaders.length}
                isNew={new Date(box.updated_at) > new Date(lastSeenMap.get(box.id) ?? 0)}
                isFavorite
              />
            )
          })
        ) : (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">즐겨찾는 상자가 없어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">상자 상세에서 별 아이콘을 눌러 담아두세요!</p>
          </div>
        )}
      </div>
    </main>
  )
}
