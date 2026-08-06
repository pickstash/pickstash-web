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
  const { data } = await supabase.rpc('get_folder_view_by_invite_code', { p_code: code })
  const folder = data as unknown as FolderViewerData | null

  const title = folder?.name ? `${folder.name} — 결정창고` : '결정창고 서랍 초대'
  // 설명: 서랍 안 상자 수·함께 쓰는 멤버 수로 "무엇을 함께 정리하는지" 감을 준다.
  const boxCount = folder?.boxes?.length ?? 0
  const members = folder?.member_count ?? 0
  const stats = [boxCount > 0 ? `상자 ${boxCount}개` : null, members > 1 ? `${members}명이 함께` : null]
    .filter(Boolean)
    .join(' · ')
  const description = stats || '함께 정리하러 가기'
  return {
    title,
    description,
    openGraph: { title, description, siteName: '결정창고', images: ['/icons/icon-512.png'] },
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
        <p className="text-base text-ink-soft">유효하지 않은 서랍 링크예요.</p>
      </main>
    )
  }

  // 이미 이 폴더 멤버면 뷰어 대신 폴더로 (client replace — 뒤로가기 루프 방지, RedirectToFolder 주석 참고).
  if (user) {
    const { data: mem } = await supabase
      .from('folder_members')
      .select('folder_id')
      .eq('folder_id', view.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (mem) return <RedirectToFolder folderId={view.id} />
  }

  return <FolderViewer view={view} isLoggedIn={!!user} code={code} />
}
