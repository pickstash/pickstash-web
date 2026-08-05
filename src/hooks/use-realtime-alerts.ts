'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * 알림함 실시간 — box_activities INSERT를 받아 ['alerts']를 무효화한다.
 * RLS가 realtime 전달도 스코프하므로 내가 참여한 상자의 활동만 도착(전체 브로드캐스트 아님).
 * 알림함이 열려 있는 동안 새 소식이 바로 목록에 들어온다.
 */
export function useRealtimeAlerts() {
  const qc = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('alerts:box_activities')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'box_activities' },
        () => qc.invalidateQueries({ queryKey: ['alerts'] }),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc])
}
