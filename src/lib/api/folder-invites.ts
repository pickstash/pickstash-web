import { createClient } from '@/lib/supabase/client'

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

  // 기존 서랍 멤버에게 '새 참여자' 푸시 (실패 무시). 공유 폴더면 멤버에게, 복사본이면 대상 0(no-op).
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    supabase.functions.invoke('send-push', {
      body: { folder_id: folderId, triggered_by: user.id, message_key: 'join' },
    }).catch(() => {})
  }
  return folderId
}
