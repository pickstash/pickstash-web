import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FoldersClient } from './folders-client'
import { loadFolders } from '@/lib/api/folders-list'

// 폴더 모아보기 — 내가 멤버인 폴더 전체를 카드로. 데이터는 loadFolders 공유(웹·토스).
export default async function FoldersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { nickname, me, cards } = await loadFolders(supabase, user.id)
  return <FoldersClient initialFolders={cards} nickname={nickname} me={me} />
}
