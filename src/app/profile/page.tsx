import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './profile-client'
import { loadProfile } from '@/lib/api/profile'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { nickname, avatarUrl } = await loadProfile(supabase, user.id)
  const kakaoAvatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <ProfileClient
      userId={user.id}
      nickname={nickname}
      avatarUrl={avatarUrl}
      kakaoAvatarUrl={kakaoAvatarUrl}
    />
  )
}
