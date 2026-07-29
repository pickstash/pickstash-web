import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Folder = Database['public']['Tables']['folders']['Row']

/** 내 폴더 목록 (본인 것만, RLS). */
export async function getMyFolders(): Promise<Folder[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .eq('user_id', user.id)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createFolder(name: string): Promise<Folder> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('folders')
    .insert({ user_id: user.id, name: name.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('folders').update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

/** 폴더 삭제. 분류(box_folders)는 FK cascade로 사라지고 상자 자체는 그대로 (§3-7). */
export async function deleteFolder(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
}

/** 내가 이 상자를 넣어둔 폴더 id 목록 (018 — 상자 다중 폴더 포함. 미분류면 빈 배열). */
export async function getMyBoxFolderIds(boxId: string): Promise<string[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('box_folders')
    .select('folder_id')
    .eq('user_id', user.id)
    .eq('box_id', boxId)
  return (data ?? []).map(r => r.folder_id)
}

/**
 * 이 상자가 속할 내 폴더 집합을 folderIds로 맞춘다 (018 다중 선택).
 * 빠진 폴더 행은 지우고, 새 폴더 행은 추가(기존 sort는 보존 — insert on conflict do nothing).
 * 개인별 — 남 분류엔 영향 없음.
 */
export async function setBoxFolders(boxId: string, folderIds: string[]): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // 1) 더 이상 선택 안 된 폴더에서 제외
  let del = supabase.from('box_folders').delete().eq('user_id', user.id).eq('box_id', boxId)
  if (folderIds.length > 0) del = del.not('folder_id', 'in', `(${folderIds.join(',')})`)
  const { error: delErr } = await del
  if (delErr) throw delErr

  // 2) 새로 선택된 폴더에 추가 (이미 있으면 sort 보존)
  if (folderIds.length > 0) {
    const rows = folderIds.map(folderId => ({ user_id: user.id, box_id: boxId, folder_id: folderId }))
    const { error } = await supabase
      .from('box_folders')
      .upsert(rows, { onConflict: 'user_id,box_id,folder_id', ignoreDuplicates: true })
    if (error) throw error
  }
}

/** 이 상자를 특정 폴더에서만 뺀다 (폴더 화면 편집 '빼기'). 다른 폴더 분류엔 영향 없음. */
export async function removeBoxFromFolder(boxId: string, folderId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase
    .from('box_folders')
    .delete()
    .eq('user_id', user.id)
    .eq('box_id', boxId)
    .eq('folder_id', folderId)
  if (error) throw error
}

/** 폴더 안 상자 순서 저장 (편집 모드 '완료' 시). orderedBoxIds 순서대로 sort=0,1,2… (본인 행만, RLS). */
export async function reorderBoxFolders(folderId: string, orderedBoxIds: string[]): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (orderedBoxIds.length === 0) return
  const rows = orderedBoxIds.map((boxId, i) => ({
    user_id: user.id,
    box_id: boxId,
    folder_id: folderId,
    sort: i,
  }))
  const { error } = await supabase.from('box_folders').upsert(rows, { onConflict: 'user_id,box_id,folder_id' })
  if (error) throw error
}
