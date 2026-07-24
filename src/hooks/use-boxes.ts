'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  createBox,
  getBox,
  getMessyBoxes,
  updateBoxTitle,
  updateBoxMemo,
  updateBoxDeadline,
  decideBox,
  reopenBox,
  autoDecideBox,
  deleteBox,
  leaveBox,
  markAllSeen,
  getShakingBoxes,
  type CreateBoxInput,
} from '@/lib/api/boxes'

export function useCreateBox() {
  const router = useRouter()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateBoxInput) => createBox(input),
    onSuccess: (box) => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      router.push(`/box/${box.id}`)
    },
  })
}

export function useBox(id: string) {
  return useQuery({
    queryKey: ['box', id],
    queryFn: () => getBox(id),
    enabled: !!id,
  })
}

export function useMessyBoxes() {
  return useQuery({
    queryKey: ['boxes', 'messy'],
    queryFn: getMessyBoxes,
  })
}

export function useUpdateBoxTitle(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (title: string) => updateBoxTitle(boxId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
    },
  })
}

export function useUpdateBoxMemo(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memo: string | null) => updateBoxMemo(boxId, memo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
    },
  })
}

export function useUpdateBoxDeadline(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deadline_at: string | null) => updateBoxDeadline(boxId, deadline_at),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
    },
  })
}

/** 결정: 선택한 선택지(들)로 정리완료 */
export function useDecideBox(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (optionIds: string[]) => decideBox(boxId, optionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })
    },
  })
}

/** 마감 투표 자동 결정 (lazy commit) */
export function useAutoDecideBox(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => autoDecideBox(boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })
    },
  })
}

export function useDeleteBox() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (boxId: string) => deleteBox(boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      router.push('/')
    },
  })
}

export function useLeaveBox() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (boxId: string) => leaveBox(boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      router.push('/')
    },
  })
}

export function useReopenBox(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reopenBox(boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })  // 번복 시 decided_at 해제 반영
    },
  })
}

export function useShakingBoxes() {
  return useQuery({ queryKey: ['boxes', 'shaking'], queryFn: getShakingBoxes })
}

export function useMarkAllSeen() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllSeen,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boxes', 'shaking'] }),
  })
}
