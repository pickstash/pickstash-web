'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNav } from '@/lib/nav/nav'
import { getCoParticipants, inviteUsersToBox } from '@/lib/api/invites'

/** '함께했던 사람' 초대 후보(이 상자에 아직 없는 과거 공동 참여자). 시트 열렸을 때만 조회. */
export function useCoParticipants(boxId: string, enabled = true) {
  return useQuery({
    queryKey: ['co-participants', boxId],
    queryFn: () => getCoParticipants(boxId),
    enabled: enabled && !!boxId,
  })
}

/** 고른 사람들을 이 상자에 바로 참여시키기(+초대 푸시). */
export function useInviteUsersToBox(boxId: string) {
  const qc = useQueryClient()
  const nav = useNav()
  return useMutation({
    mutationFn: (userIds: string[]) => inviteUsersToBox(boxId, userIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['co-participants', boxId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['box', boxId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['box-detail', boxId], refetchType: 'all' })
      nav.refresh() // 웹 RSC(상세·목록 참여자) 재요청 + 토스 전체 무효화
    },
  })
}
