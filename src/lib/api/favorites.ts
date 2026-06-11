import { createClient } from '@/lib/supabase/client'

export async function addFavorite(boxId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('favorites').insert({ user_id: user.id, box_id: boxId })
}

export async function removeFavorite(boxId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('favorites').delete().eq('user_id', user.id).eq('box_id', boxId)
}

export async function getMyFavoriteBoxIds(): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase.from('favorites').select('box_id')
  return (data ?? []).map(f => f.box_id)
}
