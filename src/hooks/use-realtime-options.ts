'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * 선택지 목록 실시간 반영: 다른 참여자가 선택지를 추가/삭제하거나 댓글을 달면
 * 새로고침 없이 목록이 갱신된다(options·comments 변경 시 목록 쿼리 무효화).
 * ⚠️ options 테이블이 supabase_realtime publication + REPLICA IDENTITY FULL 이어야 동작(019 이후 마이그레이션).
 */
export function useRealtimeOptions(boxId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`options:box:${boxId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'options' },
        () => qc.invalidateQueries({ queryKey: ['options', boxId] }),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => qc.invalidateQueries({ queryKey: ['options', boxId] }), // 댓글 수 갱신
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [boxId, qc])
}
