'use client'

import { useState } from 'react'
import { Icon } from '@/components/icon'

/**
 * 폴더 공유 링크 버튼 (018) — 폴더 뷰어/참여 링크(`/folder-invite/<code>`)를 클립보드에 복사한다.
 * 링크를 받은 사람은 로그인 없이 폴더 안 상자를 구경(뷰어)하고, 로그인 후 참여하면
 * 폴더 안 모든 상자에 참여자로 등록되고 폴더가 자기 계정으로 복사된다.
 */
export function ShareFolderLinkButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/folder-invite/${inviteCode}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* 폴백 실패 시 조용히 무시 */
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="서랍 공유 링크 복사"
      className={`flex w-full items-center justify-center gap-2 rounded-field py-4 text-sm font-bold transition active:opacity-80 ${
        copied ? 'bg-butter text-ink' : 'bg-ink text-cream'
      }`}
    >
      <Icon name={copied ? 'check' : 'link'} size={17} />
      {copied ? '링크 복사됨!' : '링크로 초대하기'}
    </button>
  )
}
