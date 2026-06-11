'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  return useMutation({
    mutationFn: (name: string) => createGroup(name),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      router.push(`/groups/${group.id}`)
    },
  })
}

export function useLeaveGroup(groupId: string) {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      router.push('/groups')
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
