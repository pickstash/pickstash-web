import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppDrawer } from '@/components/app-drawer'
import { ShakingBoxesSection } from '@/components/shaking-boxes-section'
import { PushNotificationBanner } from '@/components/push-notification-banner'
import { Icon } from '@/components/icon'

const WAREHOUSES = [
  { href: '/messy', icon: 'box', sub: '아직 정리 못 한', name: '어질러진 창고' },
  { href: '/done', icon: 'check', sub: '결정이 끝난', name: '정리된 창고' },
  { href: '/favorites', icon: 'star', sub: '다시 꺼내보고 싶은', name: '즐겨찾는 창고' },
] as const

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { count: messyCount },
    { count: doneCount },
    { count: favoriteCount },
  ] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', user.id).single(),
    supabase.from('boxes').select('*', { count: 'exact', head: true })
      .is('closed_at', null),
    supabase.from('boxes').select('*', { count: 'exact', head: true })
      .not('closed_at', 'is', null),
    supabase.from('favorites').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const counts = [messyCount ?? 0, doneCount ?? 0, favoriteCount ?? 0]
  const isFirstVisit = (messyCount ?? 0) === 0 && (doneCount ?? 0) === 0

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">
          {profile?.nickname ?? ''}님의 결정창고
        </h1>
        <AppDrawer nickname={profile?.nickname ?? ''} />
      </header>

      <ShakingBoxesSection />
      <PushNotificationBanner />

      <div className="flex-1 space-y-2.5 px-5 py-5">
        {WAREHOUSES.map((w, i) => (
          <Link key={w.href} href={w.href} className="block">
            <div className="flex items-center gap-3 rounded-card border border-[#ECEADC] bg-paper px-4 py-4 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-cream text-ink">
                <Icon name={w.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-semibold text-ink-faint">{w.sub}</span>
                <span className="block text-[14.5px] font-extrabold tracking-tight text-ink">{w.name}</span>
              </span>
              <span className="text-[21px] font-extrabold tabular-nums text-ink">{counts[i]}</span>
            </div>
          </Link>
        ))}

        {isFirstVisit && (
          <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-8 text-center">
            <Image src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-2xl" />
            <div>
              <p className="text-[14px] font-extrabold text-ink">첫 상자를 만들어보세요</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                친구들과 정할 것도, 혼자 고민 중인 것도 좋아요.<br />
                상자에 담으면 결정이 남아요.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pb-10">
        <Link href="/box/new" className="block">
          <button className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80">
            새로운 상자 만들기
          </button>
        </Link>
      </div>
    </main>
  )
}
