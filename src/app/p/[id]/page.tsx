import { redirect } from 'next/navigation'

// 049: /p/[id](공개 상자 요약 뷰) 폐기 — 공개 상자도 이제 /box/[id] + BoxDetailClient로 읽기 전용 열람
// (can_read_box가 비로그인 포함 접근을 허용). 구 공유 링크 호환을 위해 리다이렉트만 남겨둔다.
export default async function PublicBoxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/box/${id}`)
}
