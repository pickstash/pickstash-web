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
  const boxId = data as string

  // 기존 참여자에게 '새 참여자' 푸시 (실패 무시)
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    supabase.functions.invoke('send-push', {
      body: { box_id: boxId, triggered_by: user.id, message_key: 'join' },
    }).catch(() => {})
  }
  return boxId
}

// ── 로그인 안 한 사용자도 링크로 보는 '읽기 전용 뷰어'(노션식) 데이터 ───────────────
// get_box_view_by_invite_code RPC(014, security definer)가 상자 전체 스냅샷을 jsonb로 준다.

export interface BoxViewerComment {
  id: string
  body: string
  parent_comment_id: string | null
  edited_at: string | null
  created_at: string
  user_id: string
  nickname: string
  avatar_url: string | null
  like_count: number
}

export interface BoxViewerOption {
  id: string
  name: string
  content: unknown // OptionBlock[](jsonb) — parseBlocks로 안전 파싱
  decided_at: string | null
  created_at: string
  created_by: string
  like_count: number
  comments: BoxViewerComment[]
}

export interface BoxViewerParticipant {
  id: string
  nickname: string
  avatar_url: string | null
}

export interface BoxViewerData {
  id: string
  title: string
  memo: string | null
  decision_mode: 'manual' | 'auto_deadline'
  deadline_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
  invite_code: string
  participant_count: number
  participants: BoxViewerParticipant[]
  options: BoxViewerOption[]
}

/** 초대 링크 읽기 전용 뷰어용 상자 전체 조회(비로그인 포함). 없으면 null. */
export async function getBoxViewByInviteCode(code: string): Promise<BoxViewerData | null> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_box_view_by_invite_code', { p_code: code })
  return (data as unknown as BoxViewerData | null) ?? null
}
