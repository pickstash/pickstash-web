import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './profile-client'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('id', user.id)
    .single()

  const kakaoAvatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <ProfileClient
      userId={user.id}
      nickname={profile?.nickname ?? ''}
      avatarUrl={profile?.avatar_url ?? null}
      kakaoAvatarUrl={kakaoAvatarUrl}
    />
  )
}
