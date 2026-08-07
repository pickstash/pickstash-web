import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HomeView } from '@/components/home-view'
import { OnboardingScreen } from '@/components/onboarding-screen'
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

  // 온보딩: 상자(진행중·정리됨)·서랍이 하나도 없을 때만. 토스 App.tsx 게이트와 동일 기준.
  if (data.openCount === 0 && data.doneCount === 0 && data.folders.length === 0) {
    return <OnboardingScreen nickname={data.nickname} />
  }

  return <HomeView {...data} />
}
