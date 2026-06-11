import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GroupDetailClient } from './group-detail-client'
import type { GroupWithMembers } from '@/lib/api/groups'

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('groups')
    .select(`*, group_members(user_id, joined_at, profiles(id, nickname, avatar_url))`)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const group = data as unknown as GroupWithMembers
  const isMember = group.group_members.some(m => m.user_id === user.id)
  if (!isMember) redirect('/groups')

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pickstash-web.vercel.app'}/group-invite/${group.invite_code}`

  return (
    <GroupDetailClient
      group={group}
      currentUserId={user.id}
      inviteUrl={inviteUrl}
    />
  )
}
