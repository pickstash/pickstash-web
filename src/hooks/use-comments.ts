'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getComments, createComment, updateComment, deleteComment } from '@/lib/api/comments'

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', optionId] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', optionId] }),
  })
}
