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

  const [{ data: option }, { data: boxData }, { data: me }] = await Promise.all([
    supabase.from('options').select('*').eq('id', optionId).single(),
    supabase
      .from('boxes')
      .select('*, box_participants(user_id, role, profiles(id, nickname, avatar_url))')
      .eq('id', boxId)
      .single(),
    supabase.from('profiles').select('nickname').eq('id', user.id).single(),
  ])

  if (!option || !boxData) notFound()

  const box = boxData as typeof boxData & {
    box_participants: {
      user_id: string
      role: string
      profiles: { id: string; nickname: string; avatar_url: string | null } | null
    }[]
  }
  const myParticipant = box.box_participants.find(p => p.user_id === user.id)
  if (!myParticipant) redirect('/')

  const participants = box.box_participants
    .filter(p => p.profiles)
    .map(p => ({ id: p.profiles!.id, nickname: p.profiles!.nickname, avatar_url: p.profiles!.avatar_url }))

  // 선택지 생성자 프로필 (상단 히어로 메타에 표시)
  const { data: creator } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('id', option.created_by)
    .single()

  const status = getBoxStatus(box)
  const canVote = status === 'OPEN'

  return (
    <OptionDetailClient
      option={option}
      creator={creator}
      boxId={boxId}
      round={box.current_round}
      canVote={canVote}
      currentUserId={user.id}
      myNickname={me?.nickname ?? ''}
      participants={participants}
    />
  )
}
