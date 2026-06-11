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
  const { data } = await supabase.rpc('get_group_by_invite_code', { p_code: code })
  const group = data?.[0]

  const title = group?.name ? `${group.name} — 결정창고 그룹` : '결정창고 그룹 초대'
  return {
    title,
    description: '그룹 참여하기',
    openGraph: { title, description: '그룹 참여하기', siteName: '결정창고' },
  }
}

export default async function GroupInviteLandingPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  const [{ data: { user } }, { data: groupData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('get_group_by_invite_code', { p_code: code }),
  ])

  const group = groupData?.[0]

  if (user && group) {
    const { data: member } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single()
    if (member) redirect(`/groups/${group.id}`)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">그룹 초대</p>
          {group ? (
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
          ) : (
            <p className="text-base text-gray-400">유효하지 않은 초대 링크예요.</p>
          )}
        </div>
        {group && <JoinClient code={code} isLoggedIn={!!user} />}
      </div>
    </main>
  )
}
