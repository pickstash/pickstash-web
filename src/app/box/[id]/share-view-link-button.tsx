'use client'

import { useState } from 'react'
import { Icon } from '@/components/icon'

/**
 * 뷰어 링크 공유 버튼 — 로그인 사용자가 자기 상자의 읽기 전용 뷰어 링크(`/invite/<code>`)를
 * 클립보드에 복사한다. 링크를 받은 사람은 로그인 없이 상자를 '구경(뷰어 모드)'할 수 있다.
 * (카카오톡 초대와 별개 — 참여가 아니라 열람 공유용.)
 */
export function ShareViewLinkButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/invite/${inviteCode}`
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
      aria-label="구경 링크 복사"
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-bold transition ${
        copied
          ? 'border-butter-dark bg-butter-tint text-ink'
          : 'border-line bg-paper text-ink-soft active:bg-cream'
      }`}
    >
      <Icon name={copied ? 'check' : 'share'} size={14} />
      {copied ? '링크 복사됨!' : '링크 공유'}
    </button>
  )
}
