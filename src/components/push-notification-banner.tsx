'use client'

import { useEffect, useState } from 'react'
import { subscribeToPush, getPushPermission } from '@/lib/api/push'

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
    <div className="mx-5 mt-4 bg-gray-900 text-white rounded-2xl px-4 py-3.5 flex items-center gap-3">
      <span className="text-xl shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">들썩이는 상자 알림 받기</p>
        <p className="text-xs text-gray-400 mt-0.5">친구가 업데이트하면 바로 알려드려요</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleDismiss}
          className="text-xs text-gray-400 px-2 py-1"
        >
          나중에
        </button>
        <button
          onClick={handleAllow}
          disabled={loading}
          className="text-xs bg-white text-gray-900 font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          받기
        </button>
      </div>
    </div>
  )
}
