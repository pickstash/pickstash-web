import { AppLink } from '@/lib/nav/nav'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppDrawer } from '@/components/app-drawer'
import { DecisionHero, type OpenBoxCard } from '@/components/decision-hero'
import { DecisionRail } from '@/components/decision-rail'
import { FolderChips } from '@/components/folder-chips'
import { PushNotificationBanner } from '@/components/push-notification-banner'
import { Icon } from '@/components/icon'
import { getVoteResult } from '@/lib/domain/winner'
import type { Box } from '@/lib/api/boxes'
import type { Folder } from '@/lib/api/folders'

type RawOpenBox = Box & {
  box_participants: { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }[]
}

const RAIL_LIMIT = 8 // 히어로 1개 + 레일 최대 8개까지만 좋아요 집계/표시

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
    supabase.from('folders').select('*').order('sort').order('created_at'), // RLS: 내가 멤버인 폴더만(021)
  ])

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))
  const openBoxes = (rawOpenBoxes ?? []) as unknown as RawOpenBox[]

  // 정렬: 마감 임박(auto+deadline) 먼저 → NEW → 최근. 히어로 = 가장 급한 상자.
  const deadlineTime = (b: RawOpenBox) =>
    b.decision_mode === 'auto_deadline' && b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity
  const isNewOf = (b: RawOpenBox) => new Date(b.updated_at) > new Date(lastSeenMap.get(b.id) ?? 0)

  const sorted = [...openBoxes].sort((a, b) => {
    const da = deadlineTime(a), db = deadlineTime(b)
    if (da !== db) return da - db
    const na = isNewOf(a), nb = isNewOf(b)
    if (na !== nb) return na ? -1 : 1
    return 0 // 쿼리의 updated_at desc 유지
  })

  const displayed = sorted.slice(0, RAIL_LIMIT + 1)

  // 표시할 상자들의 좋아요 집계(총합 + 1위/공동 1위)
  const likeByBox = new Map<string, { total: number; leaders: string[] }>()
  const ids = displayed.map(b => b.id)
  if (ids.length > 0) {
    const { data: opts } = await supabase.from('options').select('id, box_id, name').in('box_id', ids)
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
      const r = getVoteResult(summaries)
      likeByBox.set(boxId, { total, leaders: r.winner ? [r.winner] : r.coLeaders })
    }
  }

  const toCard = (box: RawOpenBox): OpenBoxCard => {
    const like = likeByBox.get(box.id)
    return {
      id: box.id,
      title: box.title,
      isNew: isNewOf(box),
      isFavorite: favoriteSet.has(box.id),
      isSolo: box.box_participants.length <= 1,
      isAuto: box.decision_mode === 'auto_deadline',
      deadlineAt: box.deadline_at,
      participants: box.box_participants,
      totalLikes: like?.total ?? 0,
      leaders: like?.leaders ?? [],
    }
  }

  const cards = displayed.map(toCard)
  const hero = cards[0] ?? null
  const railCards = cards.slice(1)

  const openCount = openBoxes.length
  const favoriteCount = favs?.length ?? 0

  const warehouses = [
    { href: '/messy', icon: 'box', name: '어질러진', count: openCount },
    { href: '/done', icon: 'check', name: '정리된', count: doneCount ?? 0 },
    { href: '/favorites', icon: 'star', name: '즐겨찾는', count: favoriteCount },
  ] as const

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Image src="/icons/character.png" alt="" width={32} height={24} className="h-6 w-auto" priority />
          <h1 className="truncate text-xl font-extrabold tracking-tight text-ink">
            {profile?.nickname ?? ''}님의 결정창고
          </h1>
        </div>
        <AppDrawer nickname={profile?.nickname ?? ''} />
      </header>

      <PushNotificationBanner />

      <div className="flex-1 pb-28">
        {/* ① 마감 히어로 (가장 급한 상자) */}
        <DecisionHero box={hero} />

        {/* ② 이어서 정할 상자 (가로 레일) — 결정 콘텐츠를 히어로와 함께 위로 */}
        <DecisionRail boxes={railCards} totalOpen={openCount} />

        {/* ③ 창고 요약 한 줄 (탐색) */}
        <section className="px-5 pt-5">
          <div className="flex items-stretch gap-2 rounded-[18px] border border-[#ECEADC] bg-paper p-1.5 shadow-[0_2px_10px_rgba(42,42,39,0.05)]">
            {warehouses.map((w, i) => (
              <AppLink
                key={w.href}
                href={w.href}
                className={`flex flex-1 flex-col items-center gap-1 rounded-[13px] py-2.5 active:bg-butter-tint/40 ${
                  i > 0 ? 'border-l border-[#F0EEE0]' : ''
                }`}
              >
                <span className="flex items-center gap-1 text-[10.5px] font-semibold text-ink-faint">
                  <Icon name={w.icon} size={12} />
                  {w.name}
                </span>
                <span className="text-[18px] font-extrabold tabular-nums text-ink">{w.count}</span>
              </AppLink>
            ))}
          </div>
        </section>

        {/* ④ 폴더(주제) 칩 (탐색) */}
        <FolderChips initialFolders={(folders ?? []) as Folder[]} />
      </div>

      {/* 하단 고정 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-cream px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
        <AppLink href="/box/new" className="block">
          <button className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80">
            새로운 상자 만들기
          </button>
        </AppLink>
      </div>
    </main>
  )
}
