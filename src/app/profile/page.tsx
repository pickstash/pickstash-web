import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from './profile-client'
import { loadProfile } from '@/lib/api/profile'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { nickname, avatarUrl } = await loadProfile(supabase, user.id)
  // 카카오 아바타는 http://로 오므로 https로 올린다(https 페이지 mixed-content 차단 회피).
  const kakaoAvatarUrl =
    (user.user_metadata?.avatar_url as string | undefined)?.replace(/^http:\/\//, 'https://') ?? null

  return (
    <ProfileClient
      userId={user.id}
      nickname={nickname}
      avatarUrl={avatarUrl}
      kakaoAvatarUrl={kakaoAvatarUrl}
    />
  )
}
