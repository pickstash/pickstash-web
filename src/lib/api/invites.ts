import { createClient } from '@/lib/supabase/client'

export async function getBoxByInviteCode(code: string): Promise<{ id: string; title: string } | null> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_box_by_invite_code', { p_code: code })
  return data?.[0] ?? null
}

export interface BoxInvitePreview {
  id: string
  title: string
  memo: string | null
  participant_count: number
  option_names: string[]
}

/** 초대 랜딩용 미리보기 — 로그인 전에도 무엇을 정하는 상자인지 보여준다 (S2 마찰 제로) */
export async function getBoxPreviewByInviteCode(code: string): Promise<BoxInvitePreview | null> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_box_preview_by_invite_code', { p_code: code })
  return data?.[0] ?? null
}

export async function joinBoxByInviteCode(code: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('join_box_by_invite_code', { p_code: code })
  if (error) throw error
  return data as string
}
