import { ProfileFeedView } from '@/components/profile-feed-view'

// 남의 공개 프로필 (/u/[handle]) — 인스타식 헤더 + 공개 상자 그리드.
export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  return <ProfileFeedView handle={handle} />
}
