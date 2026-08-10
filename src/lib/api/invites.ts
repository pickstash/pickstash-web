import { createClient } from '@/lib/supabase/client'
import { sendPush } from '@/lib/api/push'

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

  // 기존 참여자에게 '새 참여자' 푸시
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    sendPush({ box_id: boxId, triggered_by: user.id, message_key: 'join' })
  }
  return boxId
}

// ── 부분 초대(그때그때) — '함께했던 사람'을 골라 상자에 바로 참여시킴 ───────────────

export interface CoParticipant {
  id: string
  nickname: string
  avatar_url: string | null
}

/**
 * '함께했던 사람' = 내가 참여한 상자들의 다른 참여자(중복 제거), 이 상자에 아직 없는 사람만.
 * 토스엔 연락처·유저검색이 없어(프라이버시) 과거 공동 참여자가 초대 후보의 유일한 소스다.
 */
export async function getCoParticipants(boxId: string): Promise<CoParticipant[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: myBoxes } = await supabase
    .from('box_participants')
    .select('box_id')
    .eq('user_id', user.id)
  const boxIds = (myBoxes ?? []).map(b => b.box_id)
  if (!boxIds.length) return []

  const [{ data: co }, { data: current }] = await Promise.all([
    supabase
      .from('box_participants')
      .select('user_id, profiles(id, nickname, avatar_url)')
      .in('box_id', boxIds)
      .neq('user_id', user.id),
    supabase.from('box_participants').select('user_id').eq('box_id', boxId),
  ])

  const exclude = new Set([user.id, ...(current ?? []).map(c => c.user_id)])
  const seen = new Set<string>()
  const out: CoParticipant[] = []
  for (const row of co ?? []) {
    if (exclude.has(row.user_id) || seen.has(row.user_id)) continue
    const p = row.profiles as unknown as { id: string; nickname: string; avatar_url: string | null } | null
    if (!p) continue
    seen.add(row.user_id)
    out.push({ id: p.id, nickname: p.nickname, avatar_url: p.avatar_url })
  }
  return out.sort((a, b) => a.nickname.localeCompare(b.nickname))
}

/** 고른 사람(들)을 이 상자에 바로 참여시키고, 그들에게 초대 푸시를 보낸다. */
export async function inviteUsersToBox(boxId: string, userIds: string[]): Promise<void> {
  if (!userIds.length) return
  const supabase = createClient()
  // types.ts 미갱신 RPC — 저장소 관례대로 캐스팅(다른 곳의 (admin.from as any)와 동일).
  const { error } = await (supabase.rpc as any)('invite_users_to_box', { p_box_id: boxId, p_user_ids: userIds })
  if (error) throw error

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    sendPush({ box_id: boxId, triggered_by: user.id, target_user_ids: userIds, message_key: 'invite' })
  }
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
  checked_at: string | null
  group_label: string | null
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
  mode: 'decide' | 'checklist'
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
