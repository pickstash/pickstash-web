import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { FolderViewerData } from '@/lib/api/folder-invites'
import { FolderViewer } from './folder-viewer'
import { RedirectToFolder } from './redirect-to-folder'

interface Props {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_folder_by_invite_code', { p_code: code })
  const folder = data?.[0]

  const title = folder?.name ? `${folder.name} — 결정창고` : '결정창고 폴더 초대'
  return {
    title,
    description: '함께 정리하러 가기',
    openGraph: { title, description: '함께 정리하러 가기', siteName: '결정창고', images: ['/icons/icon-512.png'] },
  }
}

export default async function FolderInviteLandingPage({ params }: Props) {
  const { code } = await params
  const supabase = await createClient()

  const [{ data: { user } }, viewRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('get_folder_view_by_invite_code', { p_code: code }),
  ])

  const view = viewRes.data as unknown as FolderViewerData | null

  if (!view) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-base text-ink-soft">유효하지 않은 폴더 링크예요.</p>
      </main>
    )
  }

  // 소유자면 원본으로, 이미 참여(복사)했으면 내 복사본으로 (뷰어 대신).
  // client replace를 쓰는 이유는 RedirectToFolder 주석 참고(뒤로가기 무한루프 방지).
  if (user) {
    if (view.owner_id === user.id) return <RedirectToFolder folderId={view.id} />
    const { data: copies } = await supabase
      .from('folders')
      .select('id')
      .eq('user_id', user.id)
      .eq('source_folder_id', view.id)
      .limit(1)
    if (copies && copies.length > 0) return <RedirectToFolder folderId={copies[0].id} />
  }

  return <FolderViewer view={view} isLoggedIn={!!user} code={code} />
}
