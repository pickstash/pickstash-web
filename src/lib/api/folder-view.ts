import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { Box } from '@/lib/api/boxes'
import type { FolderBoxItem, FolderMember } from '@/app/folder/[id]/folder-view'

// 폴더 뷰 데이터 로더 — 웹·토스 공유. 개인별: 이 폴더의 공유 상자를 box_folders.sort 순으로.
export type FolderViewData =
  | { status: 'ok'; folderName: string; inviteCode: string; nickname: string; members: FolderMember[]; items: FolderBoxItem[] }
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

  const { data: filings } = await supabase
    .from('box_folders')
    .select('box_id, sort')
    .eq('folder_id', folderId)
    .order('sort', { ascending: true })
  const orderedIds = (filings ?? []).map(f => f.box_id)

  const [{ data: profile }, { data: participations }, { data: favs }] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', userId).single(),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', userId),
    supabase.from('favorites').select('box_id').eq('user_id', userId),
  ])

  type RawBox = Box & { box_participants: { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }[] }
  let rawBoxes: RawBox[] = []
  if (orderedIds.length > 0) {
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .in('id', orderedIds)
    rawBoxes = (data ?? []) as unknown as RawBox[]
  }

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))
  const boxMap = new Map(rawBoxes.map(b => [b.id, b]))

  // filings(sort) 순서 유지 — 삭제/누락된 상자는 건너뜀
  const items: FolderBoxItem[] = orderedIds
    .map(bid => boxMap.get(bid))
    .filter((b): b is RawBox => !!b)
    .map(b => ({
      box: b,
      participants: b.box_participants,
      isNew: new Date(b.updated_at) > new Date(lastSeenMap.get(b.id) ?? 0),
      isFavorite: favoriteSet.has(b.id),
    }))

  return { status: 'ok', folderName: folder.name, inviteCode: folder.invite_code, nickname: profile?.nickname ?? '', members, items }
}
