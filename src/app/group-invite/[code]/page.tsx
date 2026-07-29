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
    openGraph: { title, description: '그룹 참여하기', siteName: '결정창고', images: ['/icons/icon-512.png'] },
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
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="w-full max-w-[340px] space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-[12px] font-semibold text-ink-faint">그룹 초대</p>
          {group ? (
            <h1 className="text-[22px] font-extrabold tracking-tight text-ink">{group.name}</h1>
          ) : (
            <p className="text-base text-ink-soft">유효하지 않은 초대 링크예요.</p>
          )}
        </div>
        {group && <JoinClient code={code} isLoggedIn={!!user} />}
      </div>
    </main>
  )
}
