'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getBoxVotes, upsertVote, deleteVote, type VoteCount } from '@/lib/api/votes'

export function useBoxVotes(boxId: string, round: number) {
  return useQuery({
    queryKey: ['votes', boxId, round],
    queryFn: () => getBoxVotes(boxId, round),
    enabled: !!boxId,
  })
}

export function useVote(boxId: string, round: number) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      optionId,
      voteType,
      currentMyVote,
    }: {
      optionId: string
      voteType: 'like' | 'dislike'
      currentMyVote: 'like' | 'dislike' | null
    }) => {
      if (currentMyVote === voteType) {
        await deleteVote(optionId, round)
        return { optionId, newVote: null as null, oldVote: voteType }
      } else {
        await upsertVote(optionId, voteType, round)
        return { optionId, newVote: voteType, oldVote: currentMyVote }
      }
    },
    onMutate: async ({ optionId, voteType }) => {
      await qc.cancelQueries({ queryKey: ['votes', boxId, round] })
      const prev = qc.getQueryData<Record<string, VoteCount>>(['votes', boxId, round])

      qc.setQueryData<Record<string, VoteCount>>(['votes', boxId, round], old => {
        if (!old) return old
        const cur = old[optionId] ?? { like: 0, dislike: 0, myVote: null }
        const next = { ...cur }

        // remove old vote
        if (cur.myVote) next[cur.myVote] = Math.max(0, cur[cur.myVote] - 1)

        if (cur.myVote === voteType) {
          next.myVote = null
        } else {
          next[voteType] = cur[voteType] + 1
          next.myVote = voteType
        }

        return { ...old, [optionId]: next }
      })

      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['votes', boxId, round], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['votes', boxId, round] })
      // 홈 히어로 '지금 1위'는 loadHomeView가 좋아요로 계산 → 투표 시 홈은 비활성이라 refetchType:'all'로 즉시 최신화.
      qc.invalidateQueries({ queryKey: ['home'], refetchType: 'all' })
    },
  })
}
