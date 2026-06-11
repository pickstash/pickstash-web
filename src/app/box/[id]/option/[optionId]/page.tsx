import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OptionDetailClient } from './option-detail-client'
import { getBoxStatus } from '@/lib/domain/box-status'

export default async function OptionDetailPage({
  params,
}: {
  params: Promise<{ id: string; optionId: string }>
}) {
  const { id: boxId, optionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: option }, { data: boxData }] = await Promise.all([
    supabase.from('options').select('*').eq('id', optionId).single(),
    supabase
      .from('boxes')
      .select('*, box_participants(user_id, role)')
      .eq('id', boxId)
      .single(),
  ])

  if (!option || !boxData) notFound()

  const box = boxData as typeof boxData & { box_participants: { user_id: string; role: string }[] }
  const myParticipant = box.box_participants.find(p => p.user_id === user.id)
  if (!myParticipant) redirect('/')

  const status = getBoxStatus(box)
  const canVote = status === 'OPEN' || status === 'SHOWDOWN'

  return (
    <OptionDetailClient
      option={option}
      boxId={boxId}
      round={box.current_round}
      isOwner={myParticipant.role === 'owner'}
      canVote={canVote}
    />
  )
}
