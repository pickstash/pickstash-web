import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Folder = Database['public']['Tables']['folders']['Row']

/** 내가 멤버인 폴더 목록 (내 folder_members.sort 순). */
export async function getMyFolders(): Promise<Folder[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: mems, error: memErr } = await supabase
    .from('folder_members')
    .select('folder_id, sort')
    .eq('user_id', user.id)
  if (memErr) throw memErr
  if (!mems || mems.length === 0) return []

  const orderMap = new Map(mems.map(m => [m.folder_id, m.sort]))
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .in('id', mems.map(m => m.folder_id))
  if (error) throw error
  return (data ?? [])
    .slice()
    .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0) || a.created_at.localeCompare(b.created_at))
}

/**
 * 새 폴더 생성 (단일 공유 객체 + 나를 멤버로).
 * folders는 SELECT 정책이 '멤버만'이라 `.insert().select()`(RETURNING)가 걸린다 → id를 직접 만들고
 * RETURNING 없이 insert 후, 멤버 등록(빈 폴더 자가 추가 허용)하고 나서 조회한다.
 */
export async function createFolder(name: string): Promise<Folder> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const id = crypto.randomUUID()
  const { error: fErr } = await supabase.from('folders').insert({ id, name: name.trim() })
  if (fErr) throw fErr
  const { error: mErr } = await supabase.from('folder_members').insert({ folder_id: id, user_id: user.id })
  if (mErr) throw mErr

  const { data, error } = await supabase.from('folders').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

/** 이름 변경 (공유 — 멤버 누구나, 전원 반영). */
export async function renameFolder(id: string, name: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('folders').update({ name: name.trim() }).eq('id', id)
  if (error) throw error
}

/**
 * 폴더 나가기(멤버십 제거). 마지막 멤버면 트리거가 폴더를 자동 소멸시킨다(= "삭제").
 * leaveBoxes=true면 그 폴더의 상자에서도 나감(단 내가 아직 멤버인 다른 폴더에 든 상자는 제외 — RPC가 처리).
 */
export async function leaveFolder(folderId: string, leaveBoxes = false): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.rpc('leave_folder', { p_folder_id: folderId, p_leave_boxes: leaveBoxes })
  if (error) throw error
}

/** 이 상자가 들어 있는, 내가 멤버인 폴더 id 목록 (RLS가 내 폴더로 스코프). */
export async function getMyBoxFolderIds(boxId: string): Promise<string[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase.from('box_folders').select('folder_id').eq('box_id', boxId)
  return (data ?? []).map(r => r.folder_id)
}

/**
 * 이 상자가 속할 폴더 집합을 folderIds로 맞춘다 (공유 목록 — 폴더 스코프).
 * 공유 폴더에 넣으면 트리거가 폴더 멤버 전원을 그 상자에 참여시킨다(초대).
 */
export async function setBoxFolders(boxId: string, folderIds: string[]): Promise<void> {
  const supabase = createClient()

  // 1) 더 이상 선택 안 된 폴더에서 제외 (RLS가 내가 멤버인 폴더로 스코프)
  let del = supabase.from('box_folders').delete().eq('box_id', boxId)
  if (folderIds.length > 0) del = del.not('folder_id', 'in', `(${folderIds.join(',')})`)
  const { error: delErr } = await del
  if (delErr) throw delErr

  // 2) 새로 선택된 폴더에 추가 (이미 있으면 무시)
  if (folderIds.length > 0) {
    const rows = folderIds.map(folderId => ({ folder_id: folderId, box_id: boxId }))
    const { error } = await supabase
      .from('box_folders')
      .upsert(rows, { onConflict: 'folder_id,box_id', ignoreDuplicates: true })
    if (error) throw error
  }
}

/** 담기 후보(=서랍 상세의 '기존 상자 담기') 항목. */
export interface BoxPickerItem {
  id: string
  title: string
  isDone: boolean
}

/** 내가 참여한 상자 중 이 폴더에 아직 없는 것 목록 (기존 상자 담기 선택용). 최신순. */
export async function getMyBoxesNotInFolder(folderId: string): Promise<BoxPickerItem[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [{ data: parts }, { data: inFolder }] = await Promise.all([
    supabase
      .from('box_participants')
      .select('boxes(id, title, closed_at, updated_at)')
      .eq('user_id', user.id),
    supabase.from('box_folders').select('box_id').eq('folder_id', folderId),
  ])

  const already = new Set((inFolder ?? []).map(r => r.box_id))
  return (parts ?? [])
    .map(p => p.boxes as unknown as { id: string; title: string; closed_at: string | null; updated_at: string } | null)
    .filter((b): b is NonNullable<typeof b> => !!b && !already.has(b.id))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map(b => ({ id: b.id, title: b.title, isDone: !!b.closed_at }))
}

/** 기존 상자(들)를 이 폴더에 담는다 (트리거가 폴더 멤버 전원을 그 상자에 참여시킴). 이미 있으면 무시. */
export async function addBoxesToFolder(folderId: string, boxIds: string[]): Promise<void> {
  if (boxIds.length === 0) return
  const supabase = createClient()
  const rows = boxIds.map(boxId => ({ folder_id: folderId, box_id: boxId }))
  const { error } = await supabase
    .from('box_folders')
    .upsert(rows, { onConflict: 'folder_id,box_id', ignoreDuplicates: true })
  if (error) throw error
}

/** 이 상자를 특정 폴더에서만 뺀다 (공유 목록에서 제거 — 전원 반영. 상자 참여는 유지). */
export async function removeBoxFromFolder(boxId: string, folderId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('box_folders').delete().eq('box_id', boxId).eq('folder_id', folderId)
  if (error) throw error
}

/** 폴더 안 상자 순서 저장 (공유 — folder_id별 sort). */
export async function reorderBoxFolders(folderId: string, orderedBoxIds: string[]): Promise<void> {
  const supabase = createClient()
  if (orderedBoxIds.length === 0) return
  const rows = orderedBoxIds.map((boxId, i) => ({ folder_id: folderId, box_id: boxId, sort: i }))
  const { error } = await supabase.from('box_folders').upsert(rows, { onConflict: 'folder_id,box_id' })
  if (error) throw error
}
