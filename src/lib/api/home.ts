import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Folder } from '@/lib/api/folders'
import { sortOpenBoxes, buildHomeCards, buildBoxCards, HOME_RAIL_LIMIT, type OpenBoxCard, type RawOpenBox, type RecapCard, type BoxCard } from '@/lib/domain/home'

// 홈 화면 데이터 로더 — 웹(서버 클라이언트)·토스(브라우저 클라이언트)가 같은 함수를 호출한다.
// 모든 Supabase 접근은 lib/api/*에만(아키텍처 규칙). 계산은 domain/home.ts 공유 로직.
// RecapCard는 domain/home.ts로 이동(BoxCard 유니언과 함께 정의) — 기존 소비처 호환을 위해 재수출.
export type { RecapCard }

export interface HomeViewData {
  nickname: string
  hero: OpenBoxCard | null
  railCards: OpenBoxCard[]
  folders: Folder[]
  openCount: number
  doneCount: number
  favoriteCount: number
  doneRecap: RecapCard[] // 정리중 0 & 정리완료≥1일 때만 채움(홈 회고 레일)
}

export async function loadHomeView(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<HomeViewData> {
  const [
    { data: profile },
    { data: rawOpenBoxes },
    { data: participations },
    { data: favs },
    { count: doneCount },
    { data: folders },
  ] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', userId).single(),
    supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .is('closed_at', null)
      .order('updated_at', { ascending: false }),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', userId),
    supabase.from('favorites').select('box_id').eq('user_id', userId),
    supabase.from('boxes').select('*', { count: 'exact', head: true }).not('closed_at', 'is', null),
    supabase.from('folders').select('*').order('sort').order('created_at'), // RLS: 내가 멤버인 폴더만(021)
  ])

  const lastSeen = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favorites = new Set((favs ?? []).map(f => f.box_id))
  const openBoxes = (rawOpenBoxes ?? []) as unknown as RawOpenBox[]

  const sorted = sortOpenBoxes(openBoxes, lastSeen)
  const displayed = sorted.slice(0, HOME_RAIL_LIMIT + 1)

  // 표시 대상 상자들의 선택지·투표만 조회해 좋아요 집계
  const ids = displayed.map(b => b.id)
  let options: { id: string; box_id: string; name: string; checked_at?: string | null }[] = []
  let votes: { option_id: string; vote_type: string }[] = []
  if (ids.length > 0) {
    const { data: opts } = await supabase.from('options').select('id, box_id, name, checked_at').in('box_id', ids)
    options = opts ?? []
    const optIds = options.map(o => o.id)
    if (optIds.length > 0) {
      const { data: v } = await supabase.from('votes').select('option_id, vote_type').in('option_id', optIds)
      votes = v ?? []
    }
  }

  const { hero, railCards } = buildHomeCards(displayed, { lastSeen, favorites, options, votes })

  // 홈 '최근 정리됨' 레일 — 정리완료가 있으면 항상 최근 5개 조회(정리중이 있어도).
  // 자동마감(pg_cron)으로 방금 정리된 상자가 홈에서 바로 증발해 안 보이던 문제 방지 + 정리된 상자 접근성.
  // buildBoxCards를 그대로 태워서 참여자(혼자/여럿) 표시까지 열림 카드와 동일하게 계산한다.
  let doneRecap: RecapCard[] = []
  if ((doneCount ?? 0) > 0) {
    const { data: recent } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, box_id, name, checked_at, decided_at)')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .limit(5)
    type RecentBox = RawOpenBox & { options: { id: string; box_id: string; name: string; checked_at: string | null; decided_at: string | null }[] }
    const recentBoxes = (recent ?? []) as unknown as RecentBox[]
    const recentOptions = recentBoxes.flatMap(b => b.options ?? [])
    doneRecap = buildBoxCards(recentBoxes, { lastSeen: new Map(), favorites: new Set(), options: recentOptions, votes: [] })
      .filter((c): c is BoxCard & { status: 'done' } => c.status === 'done')
      .map((c): RecapCard => {
        const { status, ...rest } = c
        void status
        return rest
      })
  }

  return {
    nickname: profile?.nickname ?? '',
    hero,
    railCards,
    folders: (folders ?? []) as Folder[],
    openCount: openBoxes.length,
    doneCount: doneCount ?? 0,
    favoriteCount: favs?.length ?? 0,
    doneRecap,
  }
}
