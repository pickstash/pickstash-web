'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNav } from '@/lib/nav/nav'
import {
  getMyGroups,
  getGroup,
  createGroup,
  leaveGroup,
  inviteGroupToBox,
} from '@/lib/api/groups'

export function useMyGroups() {
  return useQuery({ queryKey: ['groups'], queryFn: getMyGroups })
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroup(id),
    enabled: !!id,
  })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  const nav = useNav()
  return useMutation({
    mutationFn: (name: string) => createGroup(name),
    onSuccess: (group) => {
      // 생성 후 그룹 상세로 이동 → 목록 비활성. refetchType:'all'로 뒤로가기 시 새 그룹 반영.
      qc.invalidateQueries({ queryKey: ['groups'], refetchType: 'all' })
      nav.push(`/groups/${group.id}`)
    },
  })
}

export function useLeaveGroup(groupId: string) {
  const qc = useQueryClient()
  const nav = useNav()
  return useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => {
      // replace 후 목록이 staleTime 내면 나간 그룹이 잔존 → refetchType:'all'로 즉시 제거.
      qc.invalidateQueries({ queryKey: ['groups'], refetchType: 'all' })
      nav.replace('/groups') // 나간 그룹으로 back하면 '멤버 아님→/groups' 리다이렉트 루프 → 교체
    },
  })
}

export function useInviteGroupToBox(boxId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => inviteGroupToBox(boxId, groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['box', boxId] })
    },
  })
}
