import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { FolderBoxItem, FolderMember } from '@/app/folder/[id]/folder-view'
import { buildBoxCards, type BoxCard, type RawOpenBox } from '@/lib/domain/home'

// 폴더 뷰 데이터 로더 — 웹·토스 공유. 개인별: 이 폴더의 공유 상자를 box_folders.sort 순으로.
export type FolderViewData =
  | { status: 'ok'; folderName: string; inviteCode: string; nickname: string; members: FolderMember[]; items: FolderBoxItem[]; cards: BoxCard[] }
  | { status: 'not_found' }

export async function loadFolderView(
  supabase: SupabaseClient<Database>,
  folderId: string,
  userId: string,
): Promise<FolderViewData> {
  // 폴더는 멤버만 조회 가능(RLS) — 멤버 아니거나 없으면 not_found
  const { data: folder } = await supabase.from('folders').select('id, name, invite_code').eq('id', folderId).single()
  if (!folder) return { status: 'not_found' }

  const { data: memberRows } = await supabase
    .from('folder_members')
    .select('user_id, profiles(id, nickname, avatar_url)')
    .eq('folder_id', folderId)
    .order('joined_at', { ascending: true })
  const members = (memberRows ?? []) as unknown as FolderMember[]

  // 048: box_folders는 담은 사람(added_by)별로 스코프된다 — 같은 상자를 여러 멤버가 각자 담을 수 있다.
  // RLS가 이미 (내가 담았거나 shared=true인) 링크만 돌려주므로, 여기서는 box_id로 dedupe만 하면 된다.
  // 내가 담은 행이 있으면 그 행(shared·sort)을 쓰고, 없으면(남이 공유해서 보이는 것) shared=true·addedByMe=false.
  const { data: filings } = await supabase
    .from('box_folders')
    .select('box_id, sort, shared, added_by')
    .eq('folder_id', folderId)
    // sort 동점이면 created_at로 확정 — tiebreaker 없으면 재조회마다 순서가 뒤섞여
    // 공유/나만 토글(refetch) 시 상자 순서가 바뀌는 버그가 난다.
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true })
  const filingRows = (filings ?? []) as unknown as { box_id: string; sort: number; shared: boolean; added_by: string }[]

  const orderedIds: string[] = []
  const sharedMap = new Map<string, boolean>()
  const addedByMeMap = new Map<string, boolean>()
  for (const f of filingRows) {
    const mine = f.added_by === userId
    if (!orderedIds.includes(f.box_id)) orderedIds.push(f.box_id)
    // 내 링크가 있으면 그 값으로 덮어쓴다(먼저 만난 남의 공유 링크보다 우선).
    if (mine || !addedByMeMap.get(f.box_id)) {
      sharedMap.set(f.box_id, mine ? (f.shared ?? true) : true)
      addedByMeMap.set(f.box_id, mine)
    }
  }

  const [{ data: profile }, { data: participations }, { data: favs }] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', userId).single(),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', userId),
    supabase.from('bookmarks').select('box_id').eq('user_id', userId),
  ])

  let rawBoxes: RawOpenBox[] = []
  if (orderedIds.length > 0) {
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .in('id', orderedIds)
    rawBoxes = (data ?? []) as unknown as RawOpenBox[]
  }

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))
  const boxMap = new Map(rawBoxes.map(b => [b.id, b]))

  // filings(sort) 순서 유지 — 삭제/누락된 상자는 건너뜀
  const orderedBoxes = orderedIds.map(bid => boxMap.get(bid)).filter((b): b is RawOpenBox => !!b)

  const items: FolderBoxItem[] = orderedBoxes.map(b => ({
    box: b,
    participants: b.box_participants,
    isNew: new Date(b.updated_at) > new Date(lastSeenMap.get(b.id) ?? 0),
    isFavorite: favoriteSet.has(b.id),
    shared: sharedMap.get(b.id) ?? true,
    addedByMe: addedByMeMap.get(b.id) ?? false,
  }))

  // 홈 서랍 레일과 동일한 카드(체크진행률·인기리더·선택지N개·결정문구) — 선택지·투표 추가 조회.
  const boxIds = orderedBoxes.map(b => b.id)
  let options: { id: string; box_id: string; name: string; checked_at?: string | null; decided_at?: string | null }[] = []
  let votes: { option_id: string; vote_type: string }[] = []
  if (boxIds.length > 0) {
    const { data: opts } = await supabase.from('options').select('id, box_id, name, checked_at, decided_at').in('box_id', boxIds)
    options = opts ?? []
    const optIds = options.map(o => o.id)
    if (optIds.length > 0) {
      const { data: v } = await supabase.from('votes').select('option_id, vote_type').in('option_id', optIds)
      votes = v ?? []
    }
  }
  const cards = buildBoxCards(orderedBoxes, { lastSeen: lastSeenMap, favorites: favoriteSet, options, votes })

  return { status: 'ok', folderName: folder.name, inviteCode: folder.invite_code, nickname: profile?.nickname ?? '', members, items, cards }
}
