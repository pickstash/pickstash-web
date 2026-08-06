'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { getComments, createComment, updateComment, deleteComment } from '@/lib/api/comments'

// 댓글 추가/삭제로 바뀌는 '댓글수'가 보이는 화면들 무효화 — 선택지 카드(['options']),
// 토스 상자 상세(['box-detail']), 홈 카드(['home']). 대부분 비활성이라 refetchType:'all'.
function invalidateCommentCounts(qc: QueryClient, optionId: string) {
  qc.invalidateQueries({ queryKey: ['comments', optionId] })
  qc.invalidateQueries({ queryKey: ['options'], refetchType: 'all' })
  qc.invalidateQueries({ queryKey: ['box-detail'], refetchType: 'all' })
  qc.invalidateQueries({ queryKey: ['home'], refetchType: 'all' })
}

export function useComments(optionId: string) {
  return useQuery({
    queryKey: ['comments', optionId],
    queryFn: () => getComments(optionId),
    enabled: !!optionId,
  })
}

export function useCreateComment(optionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, parentCommentId }: { body: string; parentCommentId?: string }) =>
      createComment(optionId, body, { parentCommentId }),
    onSuccess: () => invalidateCommentCounts(qc, optionId),
  })
}

export function useUpdateComment(optionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => updateComment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', optionId] }),
  })
}

export function useDeleteComment(optionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: () => invalidateCommentCounts(qc, optionId),
  })
}
