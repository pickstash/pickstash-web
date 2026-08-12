import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { BoxViewerData } from '@/lib/api/invites'
import { RedirectToBox } from '../../redirect-to-box'
import { OptionViewer } from './option-viewer'

interface Props {
  params: Promise<{ code: string; optionId: string }>
}

// 049: 초대 뷰어의 선택지 상세 — 같은 스냅샷 RPC(get_box_view_by_invite_code)에서 해당 옵션만 추출해
// 참여자 화면(option-detail-client)과 같은 레이아웃으로 전체 본문·댓글을 보여준다(페이지 이동, 요약 없음).
export default async function InviteOptionPage({ params }: Props) {
  const { code, optionId } = await params
  const supabase = await createClient()

  const [{ data: { user } }, viewRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('get_box_view_by_invite_code', { p_code: code }),
  ])

  const view = viewRes.data as unknown as BoxViewerData | null
  if (!view) notFound()

  // 이미 참여자면 편집 가능한 선택지 상세로 이동.
  if (user && view.participants.some(p => p.id === user.id)) {
    return <RedirectToBox boxId={view.id} optionId={optionId} />
  }

  const option = view.options.find(o => o.id === optionId)
  if (!option) notFound()

  const creator = view.participants.find(p => p.id === option.created_by) ?? null

  return <OptionViewer view={view} option={option} creator={creator} code={code} />
}
