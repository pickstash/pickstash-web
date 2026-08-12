import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OptionDetailClient } from './option-detail-client'
import { loadOptionDetail } from '@/lib/api/option-detail'

// 049: 비로그인도 접근 가능(공개 상자 열람) — RLS(can_read_box)가 실제 접근을 가르고, 없으면 not_found.
export default async function OptionDetailPage({
  params,
}: {
  params: Promise<{ id: string; optionId: string }>
}) {
  const { id: boxId, optionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const r = await loadOptionDetail(supabase, boxId, optionId, user?.id ?? null)
  if (r.status === 'not_found') notFound()

  return (
    <OptionDetailClient
      option={r.option}
      creator={r.creator}
      boxId={boxId}
      round={r.round}
      canVote={r.canVote}
      checklist={r.checklist}
      checkable={r.checkable}
      currentUserId={user?.id ?? ''}
      myNickname={r.myNickname}
      participants={r.participants}
      isParticipant={r.isParticipant}
    />
  )
}
