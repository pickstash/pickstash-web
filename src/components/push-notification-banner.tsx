'use client'

import { useEffect, useState } from 'react'
import { subscribeToPush, getPushPermission } from '@/lib/api/push'
import { Icon } from '@/components/icon'

export function PushNotificationBanner() {
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return
    const dismissed = localStorage.getItem('push-banner-dismissed')
    if (dismissed) return
    if (getPushPermission() === 'default') setShow(true)
  }, [])

  async function handleAllow() {
    setLoading(true)
    await subscribeToPush()
    setShow(false)
    setLoading(false)
  }

  function handleDismiss() {
    localStorage.setItem('push-banner-dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="mx-5 mt-4 flex items-center gap-3 rounded-card bg-ink px-4 py-3.5 text-cream">
      <Icon name="bell" size={22} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">들썩이는 상자 알림 받기</p>
        <p className="mt-0.5 text-xs text-[#B4B2A2]">친구가 업데이트하면 바로 알려드려요</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={handleDismiss} className="px-2 py-1 text-xs text-[#8B897B]">
          나중에
        </button>
        <button
          onClick={handleAllow}
          disabled={loading}
          className="rounded-full bg-butter px-3.5 py-1.5 text-xs font-extrabold text-ink disabled:opacity-50"
        >
          받기
        </button>
      </div>
    </div>
  )
}
