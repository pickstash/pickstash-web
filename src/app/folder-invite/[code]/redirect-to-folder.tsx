'use client'

import { useEffect } from 'react'
import { useNav } from '@/lib/nav/nav'

/**
 * 폴더 소유자·이미 참여(복사)한 사용자가 폴더 초대 뷰어에 도달하면 자기 폴더로 보낸다.
 * 서버 redirect()가 아니라 client replace인 이유는 redirect-to-box.tsx 주석 참고(뒤로가기 루프 방지).
 */
export function RedirectToFolder({ folderId }: { folderId: string }) {
  const nav = useNav()

  useEffect(() => {
    nav.replace(`/folder/${folderId}`)
  }, [folderId, nav])

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <p className="text-[13px] text-ink-soft">폴더로 이동 중…</p>
    </main>
  )
}
