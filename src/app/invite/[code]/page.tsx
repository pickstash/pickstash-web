import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { BoxViewerData } from '@/lib/api/invites'
import { BoxViewer } from './box-viewer'
import { RedirectToBox } from './redirect-to-box'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_box_by_invite_code', { p_code: code })
  const box = data?.[0]

  const title = box?.title ? `${box.title} — 결정창고` : '결정창고 초대'
  return {
    title,
    description: '함께 정하러 가기',
    openGraph: { title, description: '함께 정하러 가기', siteName: '결정창고' },
  }
}

export default async function InviteLandingPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  const [{ data: { user } }, viewRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('get_box_view_by_invite_code', { p_code: code }),
  ])

  let view = viewRes.data as unknown as BoxViewerData | null

  if (!view) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-base text-ink-soft">유효하지 않은 초대 링크예요.</p>
      </main>
    )
  }

  // 이미 참여자면 편집 가능한 상자 상세로 이동 (뷰어 대신).
  // 서버 redirect()가 아니라 client replace를 쓰는 이유는 RedirectToBox 주석 참고 (뒤로가기 무한루프 방지).
  if (user && view.participants.some(p => p.id === user.id)) {
    return <RedirectToBox boxId={view.id} />
  }

  // 마감 투표 lazy commit: 로그인 사용자가 열람할 때 마감 지난 auto 상자를 자동 결정 후 재조회.
  // (비로그인 뷰어는 쓰기 유발 없이 저장된 상태 그대로 본다 — 참여자가 열면 어차피 커밋됨.)
  if (
    user &&
    view.decision_mode === 'auto_deadline' &&
    !view.closed_at &&
    view.deadline_at &&
    new Date(view.deadline_at) <= new Date()
  ) {
    await supabase.rpc('auto_decide_box', { p_box_id: view.id })
    const refetched = (await supabase.rpc('get_box_view_by_invite_code', { p_code: code }))
      .data as unknown as BoxViewerData | null
    if (refetched) view = refetched
  }

  return <BoxViewer view={view} isLoggedIn={!!user} code={code} />
}
