import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Folder = Database['public']['Tables']['folders']['Row']
/** member_count: 공유 서랍(2명+) 판별용 — 상자 담기 시 유출 방지 확인창에 쓴다. */
export type FolderWithMemberCount = Folder & { member_count: number }

/** 내가 멤버인 폴더 목록 (내 folder_members.sort 순) + 각 서랍의 전체 멤버 수. */
export async function getMyFolders(): Promise<FolderWithMemberCount[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: mems, error: memErr } = await supabase
    .from('folder_members')
    .select('folder_id, sort')
    .eq('user_id', user.id)
  if (memErr) throw memErr
  if (!mems || mems.length === 0) return []

  const folderIds = mems.map(m => m.folder_id)
  const orderMap = new Map(mems.map(m => [m.folder_id, m.sort]))

  // 각 서랍의 전체 멤버 수 (RLS: 내가 멤버인 서랍의 멤버 행은 조회 가능). folder_id별 카운트 맵.
  const [{ data, error }, { data: allMems, error: allErr }] = await Promise.all([
    supabase.from('folders').select('*').in('id', folderIds),
    supabase.from('folder_members').select('folder_id').in('folder_id', folderIds),
  ])
  if (error) throw error
  if (allErr) throw allErr

  const countMap = new Map<string, number>()
  for (const m of allMems ?? []) countMap.set(m.folder_id, (countMap.get(m.folder_id) ?? 0) + 1)

  return (data ?? [])
    .slice()
    .sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0) || a.created_at.localeCompare(b.created_at))
    .map(f => ({ ...f, member_count: countMap.get(f.id) ?? 1 }))
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

/** 이 상자가 들어 있는, 내가 멤버인 폴더 id 목록 (내가 담은 링크만 — 048 added_by 스코프). */
export async function getMyBoxFolderIds(boxId: string): Promise<string[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  // added_by(048)는 types.ts 미갱신 컬럼 — 저장소 관례대로 캐스팅.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('box_folders') as any).select('folder_id').eq('box_id', boxId).eq('added_by', user.id)
  return ((data ?? []) as { folder_id: string }[]).map(r => r.folder_id)
}

/**
 * 이 상자가 속할 (내가 담은) 폴더 집합을 folderIds로 맞춘다.
 * 048: 담기는 더 이상 초대가 아니다 — 서랍 멤버는 읽기 전용으로만 보고, 편집하려면 join_box로 직접 참여해야 한다.
 * box_folders는 담은 사람(added_by)별로 스코프되어, 같은 상자를 여러 멤버가 각자 담고 각자 공개 여부를 정할 수 있다.
 */
// sharedByFolder: 새로 담는 링크의 공유 여부(045). 기본 true(서랍 멤버 전원 조회 가능). false=나만 보기.
// 이미 있는 링크는 ignoreDuplicates라 shared가 안 바뀐다(토글은 setBoxFolderShared로).
export async function setBoxFolders(
  boxId: string,
  folderIds: string[],
  sharedByFolder: Record<string, boolean> = {},
): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // added_by(048)는 types.ts 미갱신 컬럼 — 저장소 관례대로 캐스팅.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const boxFolders = supabase.from('box_folders') as any

  // 1) 더 이상 선택 안 된 폴더에서 내 링크만 제외 (남이 담은 링크는 내 소관이 아님)
  let del = boxFolders.delete().eq('box_id', boxId).eq('added_by', user.id)
  if (folderIds.length > 0) del = del.not('folder_id', 'in', `(${folderIds.join(',')})`)
  const { error: delErr } = await del
  if (delErr) throw delErr

  // 2) 새로 선택된 폴더에 내 링크로 추가 (이미 있으면 무시)
  if (folderIds.length > 0) {
    const rows = folderIds.map(folderId => ({ folder_id: folderId, box_id: boxId, added_by: user.id, shared: sharedByFolder[folderId] ?? true }))
    const { error } = await boxFolders.upsert(rows, { onConflict: 'folder_id,box_id,added_by', ignoreDuplicates: true })
    if (error) throw error
  }
}

/** 내가 담은 링크의 공유/나만 토글(048) — 참여자 동기화 없음(가시성≠참여). RLS가 added_by=본인으로 제한. */
export async function setBoxFolderShared(folderId: string, boxId: string, shared: boolean): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // added_by(048)는 types.ts 미갱신 컬럼 — 저장소 관례대로 캐스팅.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('box_folders') as any)
    .update({ shared })
    .eq('folder_id', folderId)
    .eq('box_id', boxId)
    .eq('added_by', user.id)
  if (error) throw error
}

/** 담기 후보(=서랍 상세의 '기존 상자 담기') 항목. */
export interface BoxPickerItem {
  id: string
  title: string
  isDone: boolean
  mode: 'decide' | 'checklist'
}

/** 내가 참여한 상자 중 이 폴더에 아직 없는 것 목록 (기존 상자 담기 선택용). 최신순. */
export async function getMyBoxesNotInFolder(folderId: string): Promise<BoxPickerItem[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const [{ data: parts }, { data: inFolder }] = await Promise.all([
    supabase
      .from('box_participants')
      .select('boxes(id, title, closed_at, updated_at, mode)')
      .eq('user_id', user.id),
    supabase.from('box_folders').select('box_id').eq('folder_id', folderId),
  ])

  const already = new Set((inFolder ?? []).map(r => r.box_id))
  return (parts ?? [])
    .map(p => p.boxes as unknown as { id: string; title: string; closed_at: string | null; updated_at: string; mode: string } | null)
    .filter((b): b is NonNullable<typeof b> => !!b && !already.has(b.id))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map(b => ({ id: b.id, title: b.title, isDone: !!b.closed_at, mode: b.mode === 'checklist' ? 'checklist' : 'decide' }))
}

/** 기존 상자(들)를 이 폴더에 내 링크로 담는다(048 — 초대 아님, 읽기 가시성만). 이미 있으면 무시. */
// shared: 담는 링크의 공유 여부(045). 기본 true(서랍 멤버 전원 조회 가능). false=나만 보기.
export async function addBoxesToFolder(folderId: string, boxIds: string[], shared = true): Promise<void> {
  if (boxIds.length === 0) return
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const rows = boxIds.map(boxId => ({ folder_id: folderId, box_id: boxId, added_by: user.id, shared }))
  // added_by(048)는 types.ts 미갱신 컬럼 — 저장소 관례대로 캐스팅.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('box_folders') as any)
    .upsert(rows, { onConflict: 'folder_id,box_id,added_by', ignoreDuplicates: true })
  if (error) throw error
}

/** 내가 담은 상자를 이 폴더에서 뺀다 (남이 담은 링크는 내 소관이 아니라 RLS가 막는다). */
export async function removeBoxFromFolder(boxId: string, folderId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('box_folders') as any).delete().eq('box_id', boxId).eq('folder_id', folderId).eq('added_by', user.id)
  if (error) throw error
}

/** 폴더 안 상자 순서 저장 (내가 담은 링크의 sort만 — 남이 담은 항목은 내 소관이 아니라 호출부에서 제외해 넘긴다). */
export async function reorderBoxFolders(folderId: string, orderedBoxIds: string[]): Promise<void> {
  const supabase = createClient()
  if (orderedBoxIds.length === 0) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const rows = orderedBoxIds.map((boxId, i) => ({ folder_id: folderId, box_id: boxId, added_by: user.id, sort: i }))
  // added_by(048)는 types.ts 미갱신 컬럼 — 저장소 관례대로 캐스팅.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('box_folders') as any).upsert(rows, { onConflict: 'folder_id,box_id,added_by' })
  if (error) throw error
}
