import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxDetailClient } from './box-detail-client'
import type { BoxWithParticipants } from '@/lib/api/boxes'

export default async function BoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 마감 투표 자동 결정 (lazy commit): 마감 지난 auto_deadline 상자면 서버에서 확정. 조건 안 맞으면 no-op.
  // 상자 조회 '전에' 호출해 최신 상태(결정·정리완료)를 그대로 렌더한다.
  await supabase.rpc('auto_decide_box', { p_box_id: id })

  const [{ data, error }, { data: optionsData }] = await Promise.all([
    supabase
      .from('boxes')
      .select(`
        *,
        box_participants(
          user_id, role, joined_at, last_seen_at,
          profiles(id, nickname, avatar_url)
        )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('options')
      .select('*')
      .eq('box_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (error || !data) notFound()

  const box = data as unknown as BoxWithParticipants
  const myParticipant = box.box_participants.find(p => p.user_id === user.id)
  if (!myParticipant) redirect('/')

  const [{ data: favorite }] = await Promise.all([
    supabase.from('favorites').select('box_id').eq('user_id', user.id).eq('box_id', id).maybeSingle(),
    supabase.from('box_participants').update({ last_seen_at: new Date().toISOString() }).eq('box_id', id).eq('user_id', user.id),
  ])

  return (
    <BoxDetailClient
      box={box}
      isOwner={myParticipant.role === 'owner'}
      currentUserId={user.id}
      initialOptions={optionsData ?? []}
      initialIsFavorite={!!favorite}
    />
  )
}
