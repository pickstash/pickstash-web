import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FolderView, type FolderBoxItem, type FolderMember } from './folder-view'
import type { Box } from '@/lib/api/boxes'

// 폴더 뷰 — 주제별 상자 묶음(§3-7). 개인별: 내가 이 폴더에 넣은 상자만, box_folders.sort 순서.
// 추가(넣기)는 상자 상세의 '폴더 지정'에서만. 이 화면은 편집 모드로 순서 변경·제외.
export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 폴더는 멤버만 조회 가능(RLS) — 멤버가 아니거나 없으면 notFound (021)
  const { data: folder } = await supabase.from('folders').select('id, name, invite_code').eq('id', id).single()
  if (!folder) notFound()

  // 폴더 멤버(참여자) — 공유 폴더 상단에 아바타로 노출
  const { data: memberRows } = await supabase
    .from('folder_members')
    .select('user_id, profiles(id, nickname, avatar_url)')
    .eq('folder_id', id)
    .order('joined_at', { ascending: true })
  const members = (memberRows ?? []) as unknown as FolderMember[]

  // 이 폴더의 공유 상자 목록을 sort 순으로 (box_folders는 폴더 스코프, RLS: 멤버)
  const { data: filings } = await supabase
    .from('box_folders')
    .select('box_id, sort')
    .eq('folder_id', id)
    .order('sort', { ascending: true })
  const orderedIds = (filings ?? []).map(f => f.box_id)

  const [{ data: profile }, { data: participations }, { data: favs }] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', user.id).single(),
    supabase.from('box_participants').select('box_id, last_seen_at').eq('user_id', user.id),
    supabase.from('favorites').select('box_id').eq('user_id', user.id),
  ])

  type RawBox = Box & { box_participants: { user_id: string; profiles: { avatar_url: string | null; nickname: string } | null }[] }
  let rawBoxes: RawBox[] = []
  if (orderedIds.length > 0) {
    const { data } = await supabase
      .from('boxes')
      .select('*, box_participants(user_id, profiles(avatar_url, nickname))')
      .in('id', orderedIds)
    rawBoxes = (data ?? []) as unknown as RawBox[]
  }

  const lastSeenMap = new Map((participations ?? []).map(p => [p.box_id, p.last_seen_at]))
  const favoriteSet = new Set((favs ?? []).map(f => f.box_id))
  const boxMap = new Map(rawBoxes.map(b => [b.id, b]))

  // filings(sort) 순서 유지 — 삭제/누락된 상자는 건너뜀
  const items: FolderBoxItem[] = orderedIds
    .map(bid => boxMap.get(bid))
    .filter((b): b is RawBox => !!b)
    .map(b => ({
      box: b,
      participants: b.box_participants,
      isNew: new Date(b.updated_at) > new Date(lastSeenMap.get(b.id) ?? 0),
      isFavorite: favoriteSet.has(b.id),
    }))

  return (
    <FolderView
      folderId={folder.id}
      folderName={folder.name}
      inviteCode={folder.invite_code}
      nickname={profile?.nickname ?? ''}
      members={members}
      initialBoxes={items}
    />
  )
}
