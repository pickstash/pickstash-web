import { createClient } from '@/lib/supabase/client'

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
