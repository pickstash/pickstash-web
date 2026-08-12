import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { buildBoxCards, BRIEF_WINDOW_MS, type RawOpenBox, type BoxCard, type HomeBrief, type ShakingItem } from '@/lib/domain/home'
import { formatActivity, type BoxActivityType } from '@/lib/domain/activity-label'

// 홈 화면 데이터 로더 — 웹(서버 클라이언트)·토스(브라우저 클라이언트)가 같은 함수를 호출한다.
// 모든 Supabase 접근은 lib/api/*에만(아키텍처 규칙). 계산은 domain/home.ts 공유 로직.
// 홈 = 브리핑: ① 최근에 이렇게 정했어요(7일 이내 정리완료) → ② 들썩이는 상자(7일 이내 다른 사람 활동).
// 전체 상자 브라우징은 상자 탭이 전담.
export interface HomeViewData {
  nickname: string
  brief: HomeBrief
  openCount: number
  doneCount: number
}

export async function loadHomeView(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<HomeViewData> {
  const now = Date.now()
  const sinceIso = new Date(now - BRIEF_WINDOW_MS).toISOString()

  const [{ data: profile }, { data: favs }, { data: participations }] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', userId).single(),
    supabase.from('bookmarks').select('box_id').eq('user_id', userId),
    supabase.from('box_participants').select('box_id').eq('user_id', userId),
  ])
  const favorites = new Set((favs ?? []).map(f => f.box_id))
  // 048/049: boxes RLS가 참여자 외(서랍 공유·공개 상자)도 읽기 허용하도록 넓어져, 홈은 '내 참여 상자'만
  // 보여줘야 하므로 더 이상 RLS에만 기대지 않고 참여자 필터를 명시한다.
  const myBoxIds = (participations ?? []).map(p => p.box_id)

  let openBoxes: RawOpenBox[] = []
  let doneCount = 0
  if (myBoxIds.length > 0) {
    const [{ data: rawOpenBoxes }, { count }] = await Promise.all([
      supabase
        .from('boxes')
        .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
        .in('id', myBoxIds)
        .is('closed_at', null)
        .order('updated_at', { ascending: false }),
      supabase.from('boxes').select('*', { count: 'exact', head: true }).in('id', myBoxIds).not('closed_at', 'is', null),
    ])
    openBoxes = (rawOpenBoxes ?? []) as unknown as RawOpenBox[]
    doneCount = count ?? 0
  }

  // ② 들썩이는 상자 — 내가 참여한 '열림' 상자 중 최근 7일 내 '다른 사람' 활동이 있는 것.
  //    last_seen 무관(열어봐도 7일간 유지). 각 상자의 최신 활동 한 줄 함께.
  const openIds = openBoxes.map(b => b.id)
  const latestByBox = new Map<string, { type: string; created_at: string; meta: Record<string, unknown> | null; nickname: string }>()
  if (openIds.length > 0) {
    // 이미 처리된(수락/거절) 참여 신청은 들썩임에서 제외 — "신청했어요" 잔상 방지(046).
    // join_requests는 types.ts 미갱신 테이블 — 저장소 관례대로 캐스팅.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reqData } = await (supabase.from('join_requests' as any) as any).select('box_id, user_id, status').in('box_id', openIds)
    const reqRows = (reqData ?? []) as { box_id: string; user_id: string; status: string }[]
    const resolvedReq = new Set(reqRows.filter(r => r.status !== 'pending').map(r => `${r.box_id}:${r.user_id}`))

    const { data: acts } = await supabase
      .from('box_activities')
      .select('box_id, type, meta, created_at, actor_id, profiles:actor_id(nickname)')
      .in('box_id', openIds)
      .neq('actor_id', userId)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
    for (const a of acts ?? []) {
      if (latestByBox.has(a.box_id)) continue // desc 정렬이라 첫 번째가 최신
      if (a.type === 'join_requested' && resolvedReq.has(`${a.box_id}:${a.actor_id}`)) continue // 처리된 신청은 스킵
      const profile = a.profiles as unknown as { nickname: string } | null
      latestByBox.set(a.box_id, {
        type: a.type,
        created_at: a.created_at,
        meta: (a.meta ?? null) as Record<string, unknown> | null,
        nickname: profile?.nickname ?? '누군가',
      })
    }
  }

  const shakingBoxes = openBoxes
    .filter(b => latestByBox.has(b.id))
    .sort((a, b) => new Date(latestByBox.get(b.id)!.created_at).getTime() - new Date(latestByBox.get(a.id)!.created_at).getTime())
    .slice(0, 8)

  // 들썩이는 상자 카드에 필요한 선택지·투표만 조회(인기 리더/진행률용).
  const shakeIds = shakingBoxes.map(b => b.id)
  let options: { id: string; box_id: string; name: string; checked_at?: string | null }[] = []
  let votes: { option_id: string; vote_type: string }[] = []
  if (shakeIds.length > 0) {
    const { data: opts } = await supabase.from('options').select('id, box_id, name, checked_at').in('box_id', shakeIds)
    options = opts ?? []
    const optIds = options.map(o => o.id)
    if (optIds.length > 0) {
      const { data: v } = await supabase.from('votes').select('option_id, vote_type').in('option_id', optIds)
      votes = v ?? []
    }
  }
  const byId = new Map(buildBoxCards(shakingBoxes, { lastSeen: new Map(), favorites, options, votes }).map(c => [c.id, c]))
  const shaking: ShakingItem[] = shakingBoxes
    .map(b => {
      const card = byId.get(b.id)
      if (!card) return null
      const a = latestByBox.get(b.id)!
      const meta = (a.meta ?? {}) as { option_name?: string; vote_type?: string }
      const note = formatActivity({ type: a.type as BoxActivityType, actorNickname: a.nickname, meta }) ?? '새로운 소식이 있어요'
      return { card, note }
    })
    .filter((x): x is ShakingItem => !!x)

  // ① 최근에 이렇게 정했어요 — 최근 7일 이내 정리완료, 최대 5개. buildBoxCards로 참여자·결과까지 동일 계산.
  let recentDone: BoxCard[] = []
  if (doneCount > 0) {
    const { data: recent } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, box_id, name, checked_at, decided_at)')
      .in('id', myBoxIds)
      .not('closed_at', 'is', null)
      .gte('closed_at', sinceIso)
      .order('closed_at', { ascending: false })
      .limit(5)
    type RecentBox = RawOpenBox & { options: { id: string; box_id: string; name: string; checked_at: string | null; decided_at: string | null }[] }
    const recentBoxes = (recent ?? []) as unknown as RecentBox[]
    const recentOptions = recentBoxes.flatMap(b => b.options ?? [])
    recentDone = buildBoxCards(recentBoxes, { lastSeen: new Map(), favorites: new Set(), options: recentOptions, votes: [] })
      .filter(c => c.status === 'done')
  }

  return {
    nickname: profile?.nickname ?? '',
    brief: { recentDone, shaking },
    openCount: openBoxes.length,
    doneCount,
  }
}
