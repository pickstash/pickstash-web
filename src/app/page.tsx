import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HomeView } from '@/components/home-view'
import { loadHomeView } from '@/lib/api/home'

// 웹 홈 = 서버 전용 껍데기: 인증 가드 + 공유 로더 호출 + 공유 뷰 렌더.
// 화면·집계·fetching은 전부 공유(HomeView / loadHomeView / domain) → 토스와 동일.
// 완전 신규(상자·서랍 0)도 별도 온보딩 화면 없이 HomeView 안 빈 상태(HomeEmpty)로 처리 —
// 탭바·헤더가 그대로 있어야 첫 화면에서도 다른 곳으로 이동할 수 있다.
export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await loadHomeView(supabase, user.id)

  return <HomeView {...data} />
}
