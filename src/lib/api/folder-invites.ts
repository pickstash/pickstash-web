import { createClient } from '@/lib/supabase/client'
import { sendPush } from '@/lib/api/push'
import type { CoParticipant } from '@/lib/api/invites'

// 폴더 공유(018): 링크(/folder-invite/[code])로 폴더 통째 뷰어 + 로그인 후 참여.
// get_folder_view_by_invite_code / join_folder_by_invite_code RPC(security definer)를 감싼다.

export interface FolderViewerParticipant {
  id: string
  nickname: string
  avatar_url: string | null
}

export interface FolderViewerBox {
  id: string
  title: string
  decision_mode: 'manual' | 'auto_deadline'
  deadline_at: string | null
  closed_at: string | null
  invite_code: string // 상자 읽기전용 뷰어(/invite/[code]) 링크용
  participant_count: number
  participants: FolderViewerParticipant[]
  total_likes: number
}

export interface FolderViewerData {
  id: string
  name: string
  member_count: number
  boxes: FolderViewerBox[]
}

/** OG 메타태그용 폴더 이름 조회 (비로그인 포함). */
export async function getFolderByInviteCode(code: string): Promise<{ id: string; name: string } | null> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_folder_by_invite_code', { p_code: code })
  return data?.[0] ?? null
}

/** 폴더 뷰어용 전체 스냅샷(폴더 + 그 안 상자 목록). 비로그인 포함. 없으면 null. */
export async function getFolderViewByInviteCode(code: string): Promise<FolderViewerData | null> {
  const supabase = createClient()
  const { data } = await supabase.rpc('get_folder_view_by_invite_code', { p_code: code })
  return (data as unknown as FolderViewerData | null) ?? null
}

/**
 * 폴더 참여: 폴더 안 모든 상자에 참여자로 등록(이미 참여 중이면 유지) + 폴더를 내 계정으로 복사.
 * 반환 = 내 폴더 id(복사본, 또는 내가 소유자면 원본).
 */
export async function joinFolderByInviteCode(code: string): Promise<string> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('join_folder_by_invite_code', { p_code: code })
  if (error) throw error
  const folderId = data as string

  // 기존 서랍 멤버에게 '새 참여자' 푸시. 공유 폴더면 멤버에게, 복사본이면 대상 0(no-op).
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    sendPush({ folder_id: folderId, triggered_by: user.id, message_key: 'join' })
  }
  return folderId
}

/**
 * 서랍 초대 후보 '함께했던 사람' = 내 상자들의 공동 참여자 중, 이 서랍에 아직 없는 사람.
 * (상자 getCoParticipants의 서랍 판 — 제외 기준만 '현재 서랍 멤버'로.)
 */
export async function getCoParticipantsForFolder(folderId: string): Promise<CoParticipant[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: myBoxes } = await supabase.from('box_participants').select('box_id').eq('user_id', user.id)
  const boxIds = (myBoxes ?? []).map(b => b.box_id)
  if (!boxIds.length) return []

  const [{ data: co }, { data: members }] = await Promise.all([
    supabase.from('box_participants').select('user_id, profiles(id, nickname, avatar_url)').in('box_id', boxIds).neq('user_id', user.id),
    supabase.from('folder_members').select('user_id').eq('folder_id', folderId),
  ])

  const exclude = new Set([user.id, ...(members ?? []).map(m => m.user_id)])
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

/** 고른 사람(들)을 이 서랍에 바로 추가(+그 서랍 상자 참여는 트리거가 처리) + 초대 푸시. */
export async function inviteUsersToFolder(folderId: string, userIds: string[]): Promise<void> {
  if (!userIds.length) return
  const supabase = createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('invite_users_to_folder', { p_folder_id: folderId, p_user_ids: userIds })
  if (error) throw error

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    sendPush({ folder_id: folderId, triggered_by: user.id, target_user_ids: userIds, message_key: 'invite' })
  }
}
