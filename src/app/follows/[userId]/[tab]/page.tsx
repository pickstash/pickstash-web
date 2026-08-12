import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FollowListView } from '@/components/follow-list-view'

// 팔로워/팔로잉 목록 — 프로필 카운트 탭에서 진입. userId·tab은 path param(토스 MemoryRouter 쿼리 제약 회피).
export default async function FollowsPage({
  params,
}: {
  params: Promise<{ userId: string; tab: string }>
}) {
  const { userId, tab } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const initialTab = tab === 'following' ? 'following' : 'followers'
  return <FollowListView userId={userId} initialTab={initialTab} currentUserId={user.id} />
}
