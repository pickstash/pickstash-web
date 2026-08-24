'use client'

import { useQuery } from '@tanstack/react-query'
import { getAlerts } from '@/lib/api/alerts'
import { AlertsView } from '@/components/alerts-view'
import { Spinner } from '@/components/spinner'

// 알림함 탭 — 내 상자들의 최신 활동. 공유 AlertsView 렌더(토스 AlertsScreen과 동일 화면).
// 토스 전용 슬롯(pushBanner=알림동의 CTA, midBanner=인앱광고)은 웹에서 생략.
export default function AlertsPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts(),
  })

  if (isPending) return <Spinner className="py-16" />
  if (error) return <p className="py-16 text-center text-[13px] text-tomato">알림을 불러오지 못했어요</p>
  return <AlertsView items={data ?? []} />
}
