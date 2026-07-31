import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

// 프로필 로더 — 웹·토스 공유. 카카오 아바타(user_metadata)는 셸에서 별도로 넘긴다(토스는 없음).
export async function loadProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ nickname: string; avatarUrl: string | null }> {
  const { data } = await supabase.from('profiles').select('nickname, avatar_url').eq('id', userId).single()
  return { nickname: data?.nickname ?? '', avatarUrl: data?.avatar_url ?? null }
}

export async function updateNickname(nickname: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('profiles').update({ nickname }).eq('id', user.id)
  if (error) throw error
}

export async function updateAvatarUrl(avatarUrl: string | null): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)
  if (error) throw error
}

export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${user.id}/avatar.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
  const url = `${publicUrl}?t=${Date.now()}`
  await updateAvatarUrl(url)
  return url
}

export async function deleteAccount(reasons: string[], detail: string | null): Promise<void> {
  const supabase = createClient()
  await supabase.from('withdraw_reasons').insert({ reasons, detail })
  const { error } = await supabase.rpc('delete_account')
  if (error) throw error
  await supabase.auth.signOut()
}
