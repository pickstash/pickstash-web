import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OptionDetailClient } from './option-detail-client'
import { loadOptionDetail } from '@/lib/api/option-detail'

export default async function OptionDetailPage({
  params,
}: {
  params: Promise<{ id: string; optionId: string }>
}) {
  const { id: boxId, optionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const r = await loadOptionDetail(supabase, boxId, optionId, user.id)
  if (r.status === 'not_found') notFound()
  if (r.status === 'forbidden') redirect('/')

  return (
    <OptionDetailClient
      option={r.option}
      creator={r.creator}
      boxId={boxId}
      round={r.round}
      canVote={r.canVote}
      checklist={r.checklist}
      currentUserId={user.id}
      myNickname={r.myNickname}
      participants={r.participants}
    />
  )
}
