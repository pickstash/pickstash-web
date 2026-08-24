import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Spinner } from '@/components/spinner'
import { BoxesClient } from './boxes-client'

// '서랍' 탭 — 서버 인증 가드 후 클라 BoxesClient 렌더. useSearchParams가 Suspense 경계를 요구.
export default async function BoxesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <Suspense fallback={<Spinner className="py-16" />}>
      <BoxesClient />
    </Suspense>
  )
}
