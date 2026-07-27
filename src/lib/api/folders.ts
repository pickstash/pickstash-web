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

/** 내가 이 상자를 넣어둔 폴더 id (없으면 null = 미분류). */
export async function getMyBoxFolderId(boxId: string): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('box_folders')
    .select('folder_id')
    .eq('user_id', user.id)
    .eq('box_id', boxId)
    .maybeSingle()
  return data?.folder_id ?? null
}

/** 이 상자를 내 폴더에 넣기/빼기 (folderId=null이면 미분류). 개인별 — 남 분류엔 영향 없음. */
export async function setBoxFolder(boxId: string, folderId: string | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (folderId === null) {
    const { error } = await supabase.from('box_folders').delete().eq('user_id', user.id).eq('box_id', boxId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('box_folders')
      .upsert({ user_id: user.id, box_id: boxId, folder_id: folderId }, { onConflict: 'user_id,box_id' })
    if (error) throw error
  }
}
