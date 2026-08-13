import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'
import type { Box } from '@/lib/api/boxes'
import { getBoxStatus, isDoneStatus } from '@/lib/domain/box-status'
import { buildBoxCards, type BoxCard, type RawOpenBox } from '@/lib/domain/home'

// 상자 목록 데이터 로더 — 웹·토스 공유. 뷰는 BoxListView/BoxesScreen이 그린다.
// 'all' = 개편 '상자' 탭용: 진행/정리 안 나눈 전체 단일 스트림(최근 활동순).
export type BoxListKind = 'messy' | 'done' | 'favorites' | 'all'

type CardParticipant = { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }

export interface BoxListItem {
  box: Box
  participants: CardParticipant[]
  winnerName: string | null
  isNew: boolean
  isFavorite: boolean
}

export interface BoxListData {
  nickname: string
  items: BoxListItem[]
}

type RawBox = Box & {
  box_participants: CardParticipant[]
  options?: { id: string; name: string; decided_at: string | null }[]
}

function winnerOf(box: RawBox): string | null {
  const decided = (box.options ?? []).filter(o => o.decided_at)
  return decided.length ? decided.map(o => o.name).join(', ') : null
}

export async function loadBoxList(
  supabase: SupabaseClient<Database>,
  userId: string,
  kind: BoxListKind,
): Promise<BoxListData> {
  const [{ data: participations }, { data: favs }, { data: profile }] = await Promise.all([
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', userId),
    supabase.from('bookmarks').select('box_id').eq('user_id', userId),
    supabase.from('profiles').select('nickname').eq('id', userId).single(),
  ])
  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))
  // 048/049: boxes RLS가 참여자 외(서랍 공유·공개 상자)도 읽기 허용하도록 넓어져, '내 상자만'
  // 보여줘야 하는 목록은 더 이상 RLS에만 기대면 안 되고 참여자 필터를 명시해야 한다.
  const myBoxIds = (participations ?? []).map(p => p.box_id)

  let boxes: RawBox[] = []

  const byCreatedDesc = (a: RawBox, b: RawBox) => b.created_at.localeCompare(a.created_at)

  if (kind !== 'favorites' && myBoxIds.length === 0) {
    boxes = []
  } else if (kind === 'all') {
    // 전체: 진행/정리 통합, 최근 활동순(updated_at desc). 참여 상자만(.in) — RLS는 더 넓어졌다.
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, name, decided_at)')
      .in('id', myBoxIds)
      .order('updated_at', { ascending: false })
    boxes = (data ?? []) as unknown as RawBox[]
  } else if (kind === 'messy') {
    // 진행중: 생성일 최신순
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .in('id', myBoxIds)
      .is('closed_at', null)
      .order('created_at', { ascending: false })
    boxes = (data ?? []) as unknown as RawBox[]
  } else if (kind === 'done') {
    // 정리됨: 정리마감일(closed_at) 최신순, 동점이면 생성일 최신순
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, name, decided_at)')
      .in('id', myBoxIds)
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .order('created_at', { ascending: false })
    boxes = (data ?? []) as unknown as RawBox[]
  } else {
    // 즐겨찾기: 진행·정리 섞임 → 상자 생성일 최신순(다른 탭과 일관). 조인이라 client 정렬.
    const { data } = await supabase
      .from('bookmarks')
      .select('box_id, boxes(*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, name, decided_at))')
      .eq('user_id', userId)
    boxes = (data ?? []).map(f => f.boxes).filter(Boolean) as unknown as RawBox[]
    boxes.sort(byCreatedDesc)
  }

  const items: BoxListItem[] = boxes.map(box => {
    // done은 전부 정리완료라 승자 표시. favorites는 정리완료 상자만 승자 표시. messy는 없음.
    const showWinner = kind === 'done' || ((kind === 'favorites' || kind === 'all') && isDoneStatus(getBoxStatus(box)))
    return {
      box,
      participants: box.box_participants,
      winnerName: showWinner ? winnerOf(box) : null,
      isNew: new Date(box.updated_at) > new Date(lastSeenMap.get(box.id) ?? 0),
      isFavorite: kind === 'favorites' ? true : favoriteSet.has(box.id),
    }
  })

  return { nickname: profile?.nickname ?? '', items }
}

// '상자' 탭 전용 — 홈 서랍 레일과 완전히 같은 카드(BoxSummaryCard)를 쓰기 위해 BoxCard[]로 반환.
// loadBoxList와 달리 checked_at·votes까지 조회해 buildBoxCards(홈·서랍과 동일 계산)를 그대로 태운다.
export async function loadAllBoxCards(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<BoxCard[]> {
  type RawBoxWithOptions = RawOpenBox & {
    options: { id: string; box_id: string; name: string; checked_at: string | null; decided_at: string | null }[]
  }
  const [{ data: participations }, { data: favs }] = await Promise.all([
    // sort(050)는 types.ts 미갱신 컬럼 — 저장소 관례대로 캐스팅.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('box_participants') as any).select('box_id, last_seen_at, sort').eq('user_id', userId),
    supabase.from('bookmarks').select('box_id').eq('user_id', userId),
  ])
  // 048/049: boxes RLS가 참여자 외(서랍 공유·공개 상자)도 읽기 허용하도록 넓어져, 참여자 필터를 명시해야 한다.
  const myBoxIds = ((participations ?? []) as { box_id: string }[]).map(p => p.box_id)
  let rawBoxes: unknown[] = []
  if (myBoxIds.length > 0) {
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, box_id, name, checked_at, decided_at)')
      .in('id', myBoxIds)
      .order('updated_at', { ascending: false })
    rawBoxes = data ?? []
  }

  // 050: 개인별 수동 정렬(box_participants.sort) asc, 동점은 updated_at 최신순(위 정렬이 유지되는 stable sort).
  const sortMap = new Map<string, number>(
    ((participations ?? []) as { box_id: string; sort: number | null }[]).map(p => [p.box_id, p.sort ?? 0]),
  )
  const boxes = ((rawBoxes ?? []) as unknown as RawBoxWithOptions[])
    .sort((a, b) => (sortMap.get(a.id) ?? 0) - (sortMap.get(b.id) ?? 0))
  const options = boxes.flatMap(b => b.options ?? [])
  const optIds = options.map(o => o.id)
  let votes: { option_id: string; vote_type: string }[] = []
  if (optIds.length > 0) {
    const { data: v } = await supabase.from('votes').select('option_id, vote_type').in('option_id', optIds)
    votes = v ?? []
  }

  const lastSeen = new Map(
    ((participations ?? []) as { box_id: string; last_seen_at: string | null }[]).map(p => [p.box_id, p.last_seen_at]),
  )
  const favorites = new Set((favs ?? []).map(f => f.box_id))
  return buildBoxCards(boxes, { lastSeen, favorites, options, votes })
}

/** '상자' 탭 목록 순서 저장 — box_participants.sort(개인별). loadAllBoxCards가 이 컬럼으로 정렬. */
export async function reorderMyBoxes(orderedBoxIds: string[]): Promise<void> {
  if (orderedBoxIds.length === 0) return
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const rows = orderedBoxIds.map((box_id, i) => ({ box_id, user_id: user.id, sort: i }))
  // sort(050)·box_participants upsert — types.ts 미갱신이라 캐스팅. PK(box_id,user_id) 충돌 시 sort만 갱신.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('box_participants') as any).upsert(rows, { onConflict: 'box_id,user_id' })
  if (error) throw error
}
