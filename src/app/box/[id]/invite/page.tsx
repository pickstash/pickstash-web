import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteClient } from './invite-client'
import { PageHeader } from '@/components/page-header'
import type { BoxWithParticipants } from '@/lib/api/boxes'

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('boxes')
    .select(`
      id, title, invite_code,
      box_participants(
        user_id,
        profiles(id, nickname, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) notFound()

  const box = data as unknown as Pick<BoxWithParticipants, 'id' | 'title' | 'invite_code' | 'box_participants'>

  const myParticipant = box.box_participants.find(p => p.user_id === user.id)
  if (!myParticipant) redirect('/')

  const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pickstash-web.vercel.app'}/invite/${box.invite_code}`

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="친구 초대" fallbackHref={`/box/${id}`} />

      <div className="flex-1 space-y-4 px-5 pb-6 pt-1">
        <div className="rounded-card border border-[#ECEADC] bg-paper p-5">
          <p className="mb-1 text-[11.5px] font-semibold text-ink-faint">초대할 상자</p>
          <p className="text-[15px] font-extrabold text-ink">{box.title}</p>
        </div>

        <InviteClient boxId={id} boxTitle={box.title} inviteUrl={inviteUrl} />

        {/* 현재 참여 친구 */}
        <div className="rounded-card border border-[#ECEADC] bg-paper p-5">
          <p className="mb-3 text-[13.5px] font-extrabold text-ink">
            참여 중인 친구 {box.box_participants.length}명
          </p>
          <div className="space-y-2.5">
            {box.box_participants.map(p => (
              <div key={p.user_id} className="flex items-center gap-3">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-butter-tint">
                  {p.profiles?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.profiles.avatar_url} alt={p.profiles.nickname} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-ink">
                      {p.profiles?.nickname?.[0] ?? '?'}
                    </div>
                  )}
                </div>
                <span className="text-sm font-semibold text-ink">{p.profiles?.nickname}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
