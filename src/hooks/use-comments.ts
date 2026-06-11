'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getComments, createComment, deleteComment } from '@/lib/api/comments'

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
    mutationFn: (body: string) => createComment(optionId, body),
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
