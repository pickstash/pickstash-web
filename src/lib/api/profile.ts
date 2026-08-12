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

/** 내 한줄소개 + 관심 태그 조회 (설정 편집 프리필). */
export async function getMyBioTags(): Promise<{ bio: string; tags: string[] }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { bio: '', tags: [] }
  const { data } = await supabase.from('profiles').select('bio, tags').eq('id', user.id).single()
  return { bio: data?.bio ?? '', tags: data?.tags ?? [] }
}

/** 한줄소개 + 관심 태그 저장 (본인). tags는 정규화된 배열(#·공백 제거는 호출부). */
export async function updateProfileBio(bio: string, tags: string[]): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('profiles').update({ bio: bio || null, tags }).eq('id', user.id)
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
