import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteClient } from './invite-client'
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
        user_id, role,
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
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href={`/box/${id}`} className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">친구 초대</h1>
      </header>

      <div className="flex-1 px-5 py-6 space-y-6">
        <div className="bg-white rounded-2xl p-5">
          <p className="text-xs text-gray-400 mb-1">초대할 상자</p>
          <p className="text-base font-semibold text-gray-900">{box.title}</p>
        </div>

        <InviteClient boxTitle={box.title} inviteUrl={inviteUrl} />

        {/* 현재 참여 친구 */}
        <div className="bg-white rounded-2xl p-5">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            참여 중인 친구 {box.box_participants.length}명
          </p>
          <div className="space-y-2">
            {box.box_participants.map(p => (
              <div key={p.user_id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                  {p.profiles?.avatar_url ? (
                    <img src={p.profiles.avatar_url} alt={p.profiles.nickname} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                      {p.profiles?.nickname?.[0] ?? '?'}
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-700">{p.profiles?.nickname}</span>
                {p.role === 'owner' && (
                  <span className="text-xs text-gray-400">(방장)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
