'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addFavorite, removeFavorite, getMyFavoriteBoxIds } from '@/lib/api/favorites'

export function useMyFavoriteBoxIds() {
  return useQuery({ queryKey: ['favorites'], queryFn: getMyFavoriteBoxIds })
}

export function useToggleFavorite(boxId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (isFavorite: boolean) => {
      if (isFavorite) await removeFavorite(boxId)
      else await addFavorite(boxId)
    },
    onMutate: async (isFavorite) => {
      await qc.cancelQueries({ queryKey: ['favorites'] })
      const prev = qc.getQueryData<string[]>(['favorites'])
      qc.setQueryData<string[]>(['favorites'], old =>
        isFavorite ? (old ?? []).filter(id => id !== boxId) : [...(old ?? []), boxId]
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['favorites'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['favorites'] }),
  })
}
