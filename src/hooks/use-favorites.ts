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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['favorites'] })
      // 즐겨찾기(별표)는 홈 히어로/레일·상자탭('즐겨찾기' 필터)·서랍·상세에 반영된다.
      // 토글 시 이 화면들은 대부분 비활성이라 refetchType:'all'로 즉시 최신화(안 하면 새로고침해야 보임).
      qc.invalidateQueries({ queryKey: ['home'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['box-list'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['folder-view'], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['box-detail', boxId], refetchType: 'all' })
      // 즐겨찾기=북마크 일원화 → 프로필 저장함(참여 중 상자 포함)도 갱신.
      qc.invalidateQueries({ queryKey: ['my-bookmarks'], refetchType: 'all' })
    },
  })
}
