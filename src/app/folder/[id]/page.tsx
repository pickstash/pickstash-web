import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FolderView } from './folder-view'
import { loadFolderView } from '@/lib/api/folder-view'

// 폴더 뷰 — 주제별 상자 묶음(§3-7). 데이터·정렬은 loadFolderView 공유(웹·토스). 추가(넣기)는 상자 상세에서만.
export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const r = await loadFolderView(supabase, id, user.id)
  if (r.status === 'not_found') notFound()

  return (
    <FolderView
      folderId={id}
      folderName={r.folderName}
      inviteCode={r.inviteCode}
      nickname={r.nickname}
      currentUserId={user.id}
      members={r.members}
      initialBoxes={r.items}
      cards={r.cards}
    />
  )
}
