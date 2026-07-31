import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import type { FolderCard } from '@/app/folders/folders-client'

// 폴더 모아보기 데이터 로더 — 웹·토스 공유. 내가 멤버인 폴더를 카드(상자 수·멤버)로, sort 순.
export interface FoldersListData {
  nickname: string
  me: { id: string; nickname: string; avatar_url: string | null }
  cards: FolderCard[]
}

export async function loadFolders(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<FoldersListData> {
  const [{ data: profile }, { data: mems }] = await Promise.all([
    supabase.from('profiles').select('id, nickname, avatar_url').eq('id', userId).single(),
    supabase.from('folder_members').select('folder_id, sort').eq('user_id', userId),
  ])
  const me = { id: userId, nickname: profile?.nickname ?? '', avatar_url: profile?.avatar_url ?? null }
  const ids = (mems ?? []).map(m => m.folder_id)
  const sortMap = new Map((mems ?? []).map(m => [m.folder_id, m.sort]))

  let cards: FolderCard[] = []
  if (ids.length > 0) {
    const [{ data: folders }, { data: bf }, { data: allMems }] = await Promise.all([
      supabase.from('folders').select('id, name, invite_code').in('id', ids),
      supabase.from('box_folders').select('folder_id').in('folder_id', ids),
      supabase
        .from('folder_members')
        .select('folder_id, profiles(id, nickname, avatar_url)')
        .in('folder_id', ids)
        .order('joined_at', { ascending: true }),
    ])

    const boxCount = new Map<string, number>()
    for (const r of bf ?? []) boxCount.set(r.folder_id, (boxCount.get(r.folder_id) ?? 0) + 1)

    type MemRow = { folder_id: string; profiles: FolderCard['members'][number] | null }
    const memMap = new Map<string, FolderCard['members']>()
    for (const m of (allMems ?? []) as unknown as MemRow[]) {
      if (!m.profiles) continue
      const arr = memMap.get(m.folder_id) ?? []
      arr.push(m.profiles)
      memMap.set(m.folder_id, arr)
    }

    cards = (folders ?? [])
      .map(f => ({
        id: f.id,
        name: f.name,
        inviteCode: f.invite_code,
        boxCount: boxCount.get(f.id) ?? 0,
        members: memMap.get(f.id) ?? [],
      }))
      .sort((a, b) => (sortMap.get(a.id) ?? 0) - (sortMap.get(b.id) ?? 0))
  }

  return { nickname: profile?.nickname ?? '', me, cards }
}
