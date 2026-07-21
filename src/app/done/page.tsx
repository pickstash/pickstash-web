import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxCard } from '@/components/box-card'
import { PageHeader } from '@/components/page-header'
import { getVoteResult, buildOptionVoteSummaries } from '@/lib/domain/winner'
import type { Box } from '@/lib/api/boxes'

export default async function DonePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: rawBoxes }, { data: participations }, { data: favs }] = await Promise.all([
    supabase
      .from('boxes')
      .select(`*, box_participants(user_id), options(id, name, votes(vote_type, round))`)
      .or(`closed_at.not.is.null,deadline_at.lt.${new Date().toISOString()}`)
      .order('updated_at', { ascending: false }),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', user.id),
    supabase.from('favorites').select('box_id').eq('user_id', user.id),
  ])

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))

  type RawBox = Box & {
    box_participants: { user_id: string }[]
    options: { id: string; name: string; votes: { vote_type: string; round: number }[] }[]
  }

  const boxes = (rawBoxes ?? []) as unknown as RawBox[]

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="정리된 창고" />

      <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-soft">
        결정이 끝난 상자들이 기록으로 남아있어요.
      </p>

      <div className="flex-1 space-y-2.5 px-5 pb-10">
        {boxes.length > 0 ? (
          boxes.map(box => {
            const result = getVoteResult(buildOptionVoteSummaries(box.options, box.current_round))
            return (
              <BoxCard
                key={box.id}
                box={box}
                participantCount={box.box_participants.length}
                winnerName={result.winner}
                coLeaderCount={result.coLeaders.length}
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
