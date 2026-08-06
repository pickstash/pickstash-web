'use client'

import { useState } from 'react'
import { Icon } from '@/components/icon'
import { shareInviteLink } from '@/lib/share/native-share'

/**
 * 친구 초대 — 토스는 네이티브 공유 시트(카톡·문자 등 선택), 웹은 링크 복사.
 * shareInviteLink가 플랫폼 분기(configureNativeShare). 상자/서랍 초대와 동일 배관 재사용.
 *
 * 친구 그래프(친구추가) 기능 전이라 지금은 앱으로 초대(경로 '/').
 * 친구추가 기능이 생기면 이 경로만 친구 초대 링크로 승격하면 된다.
 */
export function FriendInviteButton() {
  const [copied, setCopied] = useState(false)

  async function invite() {
    const result = await shareInviteLink({ path: '/' })
    if (result === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <button
      onClick={invite}
      className="flex w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-line bg-paper py-3 text-[13px] font-extrabold text-ink active:bg-cream"
    >
      <Icon name={copied ? 'check' : 'user'} size={15} />
      {copied ? '링크 복사됨!' : '친구 초대하기'}
    </button>
  )
}
