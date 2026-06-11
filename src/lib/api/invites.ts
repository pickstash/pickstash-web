import { createClient } from '@/lib/supabase/client'

export async function getBoxByInviteCode(code: string): Promise<{ id: string; title: string } | null> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_box_by_invite_code', { p_code: code })
  return data?.[0] ?? null
}

export async function joinBoxByInviteCode(code: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('join_box_by_invite_code', { p_code: code })
  if (error) throw error
  return data as string
}
