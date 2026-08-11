import { PublicBoxView } from '@/components/public-box-view'

// 공개 상자 읽기 전용 뷰어 (/p/[id]).
export default async function PublicBoxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PublicBoxView boxId={id} />
}
