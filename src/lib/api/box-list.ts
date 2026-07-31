import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Box } from '@/lib/api/boxes'
import { getBoxStatus, isDoneStatus } from '@/lib/domain/box-status'

// 창고 목록(어질러진/정리된/즐겨찾는) 데이터 로더 — 웹·토스 공유. 뷰는 BoxListView가 그린다.
export type BoxListKind = 'messy' | 'done' | 'favorites'

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

  if (kind === 'messy') {
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .is('closed_at', null)
      .order('updated_at', { ascending: false })
    boxes = (data ?? []) as unknown as RawBox[]
  } else if (kind === 'done') {
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, name, decided_at)')
      .not('closed_at', 'is', null)
      .order('updated_at', { ascending: false })
    boxes = (data ?? []) as unknown as RawBox[]
  } else {
    const { data } = await supabase
      .from('favorites')
      .select('box_id, boxes(*, box_participants(user_id, profiles(avatar_url, nickname)), options(id, name, decided_at))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    boxes = (data ?? []).map(f => f.boxes).filter(Boolean) as unknown as RawBox[]
  }

  const items: BoxListItem[] = boxes.map(box => {
    // done은 전부 정리완료라 승자 표시. favorites는 정리완료 상자만 승자 표시. messy는 없음.
    const showWinner = kind === 'done' || (kind === 'favorites' && isDoneStatus(getBoxStatus(box)))
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
