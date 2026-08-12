import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BoxDetailClient } from './box-detail-client'
import { loadBoxDetail } from '@/lib/api/box-detail'

// 웹 상자 상세 = 서버 껍데기: 인증 가드 + 공유 로더 호출 + 공유 client 렌더. 데이터·집계는 loadBoxDetail 공유(토스와 동일).
export default async function BoxDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const r = await loadBoxDetail(supabase, id, user.id)
  if (r.status === 'not_found') notFound()

  return (
    <BoxDetailClient
      box={r.box}
      currentUserId={user.id}
      initialOptions={r.options}
      initialIsFavorite={r.isFavorite}
      isParticipant={r.isParticipant}
    />
  )
}
