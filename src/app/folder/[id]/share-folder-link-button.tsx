'use client'

import { useState } from 'react'
import { Icon } from '@/components/icon'
import { shareInviteLink, hasNativeShare } from '@/lib/share/native-share'

/**
 * 서랍 공유 버튼 — 서랍 뷰어/참여 링크(`/folder-invite/<code>`)를 공유한다.
 * 웹: 링크를 클립보드에 복사(받는 사람이 브라우저에서 로그인 없이 열람→참여).
 * 토스: intoss:// 딥링크를 네이티브 공유 시트로(받는 토스 유저는 앱에서 열림).
 */
export function ShareFolderLinkButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const result = await shareInviteLink({ path: `/folder-invite/${inviteCode}` })
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <button
      onClick={handleShare}
      aria-label="서랍 공유 링크"
      className={`flex w-full items-center justify-center gap-2 rounded-field border py-3.5 text-sm font-bold transition active:opacity-80 ${
        copied ? 'border-butter-dark bg-butter text-ink' : 'border-line bg-paper text-ink'
      }`}
    >
      <Icon name={copied ? 'check' : 'link'} size={17} />
      {copied ? '링크 복사됨!' : hasNativeShare() ? '새로운 사람 초대하기' : '링크로 초대하기'}
    </button>
  )
}
