import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileClient } from '../profile-client'
import { loadProfile } from '@/lib/api/profile'

// 프로필 설정(관리) — 아바타·닉네임·@handle·알림·계정. 인스타식 프로필(/profile)에서 톱니로 진입.
export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { nickname, avatarUrl } = await loadProfile(supabase, user.id)
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
