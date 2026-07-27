'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getCommentLikes, likeComment, unlikeComment, type CommentLikeCount } from '@/lib/api/comments'

export function useCommentLikes(optionId: string) {
  return useQuery({
    queryKey: ['comment-likes', optionId],
    queryFn: () => getCommentLikes(optionId),
    enabled: !!optionId,
  })
}

export function useToggleCommentLike(optionId: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, likedByMe }: { commentId: string; likedByMe: boolean }) => {
      if (likedByMe) await unlikeComment(commentId)
      else await likeComment(commentId)
    },
    onMutate: async ({ commentId, likedByMe }) => {
      await qc.cancelQueries({ queryKey: ['comment-likes', optionId] })
      const prev = qc.getQueryData<Record<string, CommentLikeCount>>(['comment-likes', optionId])

      qc.setQueryData<Record<string, CommentLikeCount>>(['comment-likes', optionId], old => {
        const cur = old?.[commentId] ?? { count: 0, likedByMe: false }
        const next = likedByMe
          ? { count: Math.max(0, cur.count - 1), likedByMe: false }
          : { count: cur.count + 1, likedByMe: true }
        return { ...old, [commentId]: next }
      })

      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['comment-likes', optionId], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['comment-likes', optionId] })
    },
  })
}
