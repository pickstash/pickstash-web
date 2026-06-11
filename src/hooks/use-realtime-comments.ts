'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeComments(optionId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`comments:option:${optionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `option_id=eq.${optionId}` },
        () => qc.invalidateQueries({ queryKey: ['comments', optionId] })
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [optionId, qc])
}
