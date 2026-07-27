'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// comment_likes엔 option_id가 없어 postgres_changes로 직접 필터링할 수 없다.
// use-realtime-votes.ts와 동일하게 필터 없이 구독해 무조건 invalidate한다(RLS + 저렴한 invalidate에 의존).
export function useRealtimeCommentLikes(optionId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`comment-likes:option:${optionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comment_likes' },
        () => {
          qc.invalidateQueries({ queryKey: ['comment-likes', optionId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [optionId, qc])
}
