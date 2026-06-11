import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppDrawer } from '@/components/app-drawer'
import { ShakingBoxesSection } from '@/components/shaking-boxes-section'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { count: messyCount },
    { count: doneCount },
  ] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', user.id).single(),
    supabase.from('boxes').select('*', { count: 'exact', head: true })
      .is('closed_at', null)
      .gte('deadline_at', new Date().toISOString()),
    supabase.from('boxes').select('*', { count: 'exact', head: true })
      .or(`closed_at.not.is.null,deadline_at.lt.${new Date().toISOString()}`),
  ])

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-5 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {profile?.nickname ?? ''}님의 결정창고
        </h1>
        <AppDrawer nickname={profile?.nickname ?? ''} />
      </header>

      <ShakingBoxesSection />

      <div className="flex-1 px-5 py-6 space-y-3">
        <Link href="/messy">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between active:bg-gray-50">
            <div>
              <p className="text-xs text-gray-400 mb-1">아직 정리 못 한</p>
              <p className="text-base font-semibold text-gray-900">어질러진 창고</p>
            </div>
            <span className="text-2xl font-bold text-gray-900">{messyCount ?? 0}</span>
          </div>
        </Link>

        <Link href="/done">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center justify-between active:bg-gray-50">
            <div>
              <p className="text-xs text-gray-400 mb-1">결정이 끝난</p>
              <p className="text-base font-semibold text-gray-900">정리된 창고</p>
            </div>
            <span className="text-2xl font-bold text-gray-900">{doneCount ?? 0}</span>
          </div>
        </Link>

        <Link href="/favorites">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-center gap-3 active:bg-gray-50">
            <span className="text-xl">⭐</span>
            <p className="text-base font-semibold text-gray-900">즐겨찾는 창고</p>
          </div>
        </Link>
      </div>

      <div className="px-5 pb-10">
        <Link href="/box/new">
          <button className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold active:opacity-80">
            새로운 상자 만들기
          </button>
        </Link>
      </div>
    </main>
  )
}
