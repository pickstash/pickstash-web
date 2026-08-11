// 소셜(공개·팔로우·북마크·탐색·프로필·참여신청) API — 036~041 마이그레이션 RPC 래퍼.
// 아키텍처 규칙: Supabase 접근은 lib/api/*에만. 읽기는 supabase 주입(웹 서버/토스 클라 공유),
// 쓰기는 클라 액션이라 createClient. 신규 RPC는 타입 미생성 → (rpc as any) 캐스팅(기존 invites.ts 패턴).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'

type SB = SupabaseClient<Database>

export interface PublicBoxCard {
  id: string
  title: string
  mode: 'decide' | 'checklist'
  tags: string[]
  published_at: string | null
  closed_at: string | null
  winner: string | null
  checked: number
  total: number
  save_count: number
  author: { id: string; handle: string | null; nickname: string; avatar_url: string | null } | null
}

export interface ProfileFeed {
  id: string
  handle: string | null
  nickname: string
  avatar_url: string | null
  bio: string | null
  followers: number
  following: number
  public_count: number
  boxes: PublicBoxCard[]
}

export interface PersonResult {
  id: string
  handle: string | null
  nickname: string
  avatar_url: string | null
  bio: string | null
  followers: number
  public_count: number
}

// ── 읽기(공유: supabase 주입) ─────────────────────────────
export async function getPublicFeed(supabase: SB, limit = 20, offset = 0): Promise<PublicBoxCard[]> {
  const { data } = await (supabase.rpc as any)('get_public_feed', { p_limit: limit, p_offset: offset })
  return (data ?? []) as PublicBoxCard[]
}

export async function getProfileFeed(supabase: SB, handle: string): Promise<ProfileFeed | null> {
  const { data } = await (supabase.rpc as any)('get_profile_feed', { p_handle: handle })
  return (data ?? null) as ProfileFeed | null
}

export async function getPublicBoxView(supabase: SB, boxId: string): Promise<unknown | null> {
  const { data } = await (supabase.rpc as any)('get_public_box_view', { p_box_id: boxId })
  return data ?? null
}

export async function searchPublic(
  supabase: SB,
  q: string,
): Promise<{ boxes: PublicBoxCard[]; people: PersonResult[] }> {
  const { data } = await (supabase.rpc as any)('search_public', { p_q: q })
  return (data ?? { boxes: [], people: [] }) as { boxes: PublicBoxCard[]; people: PersonResult[] }
}

// ── 쓰기(클라 액션) ─────────────────────────────
export async function claimHandle(handle: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase.rpc as any)('claim_handle', { p_handle: handle })
  if (error) throw error
}

export async function setBoxVisibility(boxId: string, isPublic: boolean, tags: string[] = []): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase.rpc as any)('set_box_visibility', {
    p_box_id: boxId,
    p_public: isPublic,
    p_tags: tags,
  })
  if (error) throw error
}

export async function requestToJoin(boxId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase.rpc as any)('request_to_join', { p_box_id: boxId })
  if (error) throw error
}

export async function respondJoinRequest(boxId: string, userId: string, approve: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await (supabase.rpc as any)('respond_join_request', {
    p_box_id: boxId,
    p_user_id: userId,
    p_approve: approve,
  })
  if (error) throw error
}

// 팔로우 — follows 테이블 직접(RLS: 본인 follower만 쓰기)
export async function followUser(followeeId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')
  const { error } = await (supabase.from('follows' as any) as any).insert({ follower_id: user.id, followee_id: followeeId })
  if (error) throw error
}

export async function unfollowUser(followeeId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')
  const { error } = await (supabase.from('follows' as any) as any)
    .delete().eq('follower_id', user.id).eq('followee_id', followeeId)
  if (error) throw error
}

export async function isFollowing(followeeId: string): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data } = await (supabase.from('follows' as any) as any)
    .select('followee_id').eq('follower_id', user.id).eq('followee_id', followeeId).maybeSingle()
  return !!data
}

// 북마크(저장함) — bookmarks 테이블 직접(RLS: 본인만)
export async function addBookmark(boxId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')
  const { error } = await (supabase.from('bookmarks' as any) as any).insert({ user_id: user.id, box_id: boxId })
  if (error) throw error
}

export async function removeBookmark(boxId: string): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요해요')
  const { error } = await (supabase.from('bookmarks' as any) as any)
    .delete().eq('user_id', user.id).eq('box_id', boxId)
  if (error) throw error
}
