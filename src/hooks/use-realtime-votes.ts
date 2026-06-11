'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeVotes(boxId: string, round: number) {
  const qc = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`votes:box:${boxId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        () => {
          qc.invalidateQueries({ queryKey: ['votes', boxId, round] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boxId, round, qc])
}
