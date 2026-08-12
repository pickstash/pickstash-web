'use client'

import { useEffect } from 'react'
import { useNav } from '@/lib/nav/nav'

/**
 * 참여자가 초대 뷰어(/invite/[code])에 도달했을 때 편집 가능한 상자 상세로 보낸다.
 *
 * 왜 서버 redirect()가 아니라 client replace인가:
 * 서버 redirect()는 OS 뒤로가기로 이 URL에 재진입할 때마다 다시 상자로 "앞으로" 튕기지만
 * invite 항목은 뒤로 스택에 그대로 남아, 뒤로가기가 invite↔box를 오가는 무한루프가 된다.
 * router.replace는 히스토리에서 이 invite 항목을 상자로 "교체"하므로 항목이 소진되어 루프가 안 생긴다.
 */
export function RedirectToBox({ boxId, optionId }: { boxId: string; optionId?: string }) {
  const nav = useNav()
  const target = optionId ? `/box/${boxId}/option/${optionId}` : `/box/${boxId}`

  useEffect(() => {
    nav.replace(target)
  }, [target, nav])

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <p className="text-[13px] text-ink-soft">상자로 이동 중…</p>
    </main>
  )
}
