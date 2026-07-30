import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HomeView } from '@/components/home-view'
import { PushNotificationBanner } from '@/components/push-notification-banner'
import { loadHomeView } from '@/lib/api/home'

// 웹 홈 = 서버 전용 껍데기: 인증 가드 + 공유 로더 호출 + 공유 뷰 렌더.
// 화면·집계·fetching은 전부 공유(HomeView / loadHomeView / domain) → 토스와 동일.
export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await loadHomeView(supabase, user.id)

  return <HomeView {...data} banner={<PushNotificationBanner />} />
}
