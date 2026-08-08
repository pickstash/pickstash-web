'use client'

import { useQuery } from '@tanstack/react-query'
import { getOptionLikers, getCommentLikers } from '@/lib/api/likers'

// 좋아요 명단은 시트를 열 때만 조회(enabled) — 평소엔 네트워크 부담 0.
export function useOptionLikers(optionId: string, round: number, enabled: boolean) {
  return useQuery({
    queryKey: ['option-likers', optionId, round],
    queryFn: () => getOptionLikers(optionId, round),
    enabled: enabled && !!optionId,
  })
}

export function useCommentLikers(commentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['comment-likers', commentId],
    queryFn: () => getCommentLikers(commentId!),
    enabled: enabled && !!commentId,
  })
}
