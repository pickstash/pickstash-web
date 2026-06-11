import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { JoinClient } from './join-client'

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
    description: '투표하러 가기',
    openGraph: {
      title,
      description: '투표하러 가기',
      siteName: '결정창고',
    },
  }
}

export default async function InviteLandingPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: boxData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('get_box_by_invite_code', { p_code: code }),
  ])

  const box = boxData?.[0]

  // 이미 참여자인 경우 바로 이동
  if (user && box) {
    const { data: participant } = await supabase
      .from('box_participants')
      .select('user_id')
      .eq('box_id', box.id)
      .eq('user_id', user.id)
      .single()

    if (participant) redirect(`/box/${box.id}`)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">초대받은 상자</p>
          {box ? (
            <h1 className="text-2xl font-bold text-gray-900">{box.title}</h1>
          ) : (
            <p className="text-base text-gray-400">유효하지 않은 초대 링크예요.</p>
          )}
        </div>

        {box && (
          <JoinClient code={code} isLoggedIn={!!user} />
        )}
      </div>
    </main>
  )
}
