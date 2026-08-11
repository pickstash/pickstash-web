import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Box } from '@/lib/api/boxes'
import { getBoxStatus, isDoneStatus } from '@/lib/domain/box-status'

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
    supabase.from('favorites').select('box_id').eq('user_id', userId),
    supabase.from('profiles').select('nickname').eq('id', userId).single(),
  ])
  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))

  let boxes: RawBox[] = []

  const byCreatedDesc = (a: RawBox, b: RawBox) => b.created_at.localeCompare(a.created_at)

  if (kind === 'all') {
    // 전체: 진행/정리 통합, 최근 활동순(updated_at desc). RLS로 내 참여 상자만.
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, name, decided_at)')
      .order('updated_at', { ascending: false })
    boxes = (data ?? []) as unknown as RawBox[]
  } else if (kind === 'messy') {
    // 진행중: 생성일 최신순
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .is('closed_at', null)
      .order('created_at', { ascending: false })
    boxes = (data ?? []) as unknown as RawBox[]
  } else if (kind === 'done') {
    // 정리됨: 정리마감일(closed_at) 최신순, 동점이면 생성일 최신순
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, name, decided_at)')
      .not('closed_at', 'is', null)
      .order('closed_at', { ascending: false })
      .order('created_at', { ascending: false })
    boxes = (data ?? []) as unknown as RawBox[]
  } else {
    // 즐겨찾기: 진행·정리 섞임 → 상자 생성일 최신순(다른 탭과 일관). 조인이라 client 정렬.
    const { data } = await supabase
      .from('favorites')
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
