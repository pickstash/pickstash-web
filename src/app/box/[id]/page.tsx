import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxDetailClient } from './box-detail-client'
import type { BoxWithParticipants } from '@/lib/api/boxes'

export default async function BoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('boxes')
    .select(`
      *,
      box_participants(
        user_id, role, joined_at, last_seen_at,
        profiles(id, nickname, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const box = data as unknown as BoxWithParticipants
  const myParticipant = box.box_participants.find(p => p.user_id === user.id)
  if (!myParticipant) redirect('/')

  return (
    <BoxDetailClient
      box={box}
      isOwner={myParticipant.role === 'owner'}
      currentUserId={user.id}
    />
  )
}
