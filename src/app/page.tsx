import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppDrawer } from '@/components/app-drawer'
import { DecisionQueueSection, type QueueCard } from '@/components/decision-queue-section'
import { FolderChips } from '@/components/folder-chips'
import { PushNotificationBanner } from '@/components/push-notification-banner'
import { Icon } from '@/components/icon'
import { getVoteResult } from '@/lib/domain/winner'
import type { Box } from '@/lib/api/boxes'
import type { Folder } from '@/lib/api/folders'

type RawOpenBox = Box & {
  box_participants: { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }[]
}

const HERO_LIMIT = 5

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: rawOpenBoxes },
    { data: participations },
    { data: favs },
    { count: doneCount },
    { data: folders },
  ] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', user.id).single(),
    supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .is('closed_at', null)
      .order('updated_at', { ascending: false }),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', user.id),
    supabase.from('favorites').select('box_id').eq('user_id', user.id),
    supabase.from('boxes').select('*', { count: 'exact', head: true }).not('closed_at', 'is', null),
    supabase.from('folders').select('*').eq('user_id', user.id).order('sort').order('created_at'),
  ])

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))
  const openBoxes = (rawOpenBoxes ?? []) as unknown as RawOpenBox[]

  // 정렬: NEW(내 확인 이후 변경) 먼저 → 마감 임박(auto) → 최근(쿼리 순서 유지)
  const enriched = openBoxes.map(b => ({
    box: b,
    isNew: new Date(b.updated_at) > new Date(lastSeenMap.get(b.id) ?? 0),
  }))
  const sorted = [...enriched].sort((a, b) => {
    if (a.isNew !== b.isNew) return a.isNew ? -1 : 1
    const ad = a.box.decision_mode === 'auto_deadline' && a.box.deadline_at ? new Date(a.box.deadline_at).getTime() : Infinity
    const bd = b.box.decision_mode === 'auto_deadline' && b.box.deadline_at ? new Date(b.box.deadline_at).getTime() : Infinity
    return ad - bd
  })
  const hero = sorted.slice(0, HERO_LIMIT)

  // 히어로 상자들의 좋아요 집계(총합 + 지금 1위) — top N만 조회해 가볍게.
  const likeByBox = new Map<string, { total: number; leader: string | null }>()
  const heroIds = hero.map(h => h.box.id)
  if (heroIds.length > 0) {
    const { data: opts } = await supabase.from('options').select('id, box_id, name').in('box_id', heroIds)
    const optIds = (opts ?? []).map(o => o.id)
    const { data: votes } = optIds.length
      ? await supabase.from('votes').select('option_id, vote_type').in('option_id', optIds)
      : { data: [] as { option_id: string; vote_type: string }[] }

    const likePerOption = new Map<string, number>()
    for (const v of votes ?? []) {
      if (v.vote_type === 'like') likePerOption.set(v.option_id, (likePerOption.get(v.option_id) ?? 0) + 1)
    }
    const perBox = new Map<string, { name: string; like: number }[]>()
    for (const o of opts ?? []) {
      const arr = perBox.get(o.box_id) ?? []
      arr.push({ name: o.name, like: likePerOption.get(o.id) ?? 0 })
      perBox.set(o.box_id, arr)
    }
    for (const [boxId, summaries] of perBox) {
      const total = summaries.reduce((s, o) => s + o.like, 0)
      likeByBox.set(boxId, { total, leader: getVoteResult(summaries).winner })
    }
  }

  const heroCards: QueueCard[] = hero.map(({ box, isNew }) => {
    const like = likeByBox.get(box.id)
    return {
      id: box.id,
      title: box.title,
      isNew,
      isFavorite: favoriteSet.has(box.id),
      isSolo: box.box_participants.length <= 1,
      isAuto: box.decision_mode === 'auto_deadline',
      deadlineAt: box.deadline_at,
      participants: box.box_participants,
      totalLikes: like?.total ?? 0,
      leaderName: like?.leader ?? null,
    }
  })

  const openCount = openBoxes.length
  const favoriteCount = favs?.length ?? 0
  const isFirstVisit = openCount === 0 && (doneCount ?? 0) === 0

  const warehouses = [
    { href: '/messy', icon: 'box', name: '어질러진', count: openCount },
    { href: '/done', icon: 'check', name: '정리된', count: doneCount ?? 0 },
    { href: '/favorites', icon: 'star', name: '즐겨찾는', count: favoriteCount },
  ] as const

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 backdrop-blur-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-ink">
          {profile?.nickname ?? ''}님의 결정창고
        </h1>
        <AppDrawer nickname={profile?.nickname ?? ''} />
      </header>

      <PushNotificationBanner />

      <div className="flex-1 pb-28">
        {isFirstVisit ? (
          <div className="mx-5 mt-6 flex flex-col items-center gap-3 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-12 text-center">
            <Image src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-2xl" />
            <div>
              <p className="text-[14px] font-extrabold text-ink">첫 상자를 만들어보세요</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                친구들과 정할 것도, 혼자 고민 중인 것도 좋아요.<br />
                상자에 담으면 결정이 남아요.
              </p>
            </div>
          </div>
        ) : (
          <DecisionQueueSection items={heroCards} totalOpen={openCount} />
        )}

        {/* 폴더(주제) 칩 */}
        <FolderChips initialFolders={(folders ?? []) as Folder[]} />

        {/* 창고 요약 한 줄 */}
        <section className="px-5 pt-5">
          <div className="flex items-stretch gap-2 rounded-card border border-[#ECEADC] bg-paper p-1.5 shadow-[0_2px_10px_rgba(42,42,39,0.05)]">
            {warehouses.map((w, i) => (
              <Link
                key={w.href}
                href={w.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-[14px] py-2.5 active:bg-butter-tint/40 ${
                  i > 0 ? 'border-l border-[#F0EEE0]' : ''
                }`}
              >
                <span className="flex items-center gap-1 text-[11px] font-semibold text-ink-faint">
                  <Icon name={w.icon} size={12} />
                  {w.name}
                </span>
                <span className="text-[19px] font-extrabold tabular-nums text-ink">{w.count}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-cream px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
        <Link href="/box/new" className="block">
          <button className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80">
            새로운 상자 만들기
          </button>
        </Link>
      </div>
    </main>
  )
}
