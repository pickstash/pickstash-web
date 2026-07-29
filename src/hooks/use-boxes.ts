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
  updateBoxDecisionMode,
  decideBox,
  reopenBox,
  autoDecideBox,
  deleteBox,
  leaveBox,
  markAllSeen,
  getShakingBoxes,
  type CreateBoxInput,
  type DecisionMode,
} from '@/lib/api/boxes'
import type { Option } from '@/lib/api/options'

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

export function useUpdateBoxDecisionMode(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arg: { mode: DecisionMode; deadline_at: string | null }) =>
      updateBoxDecisionMode(boxId, arg.mode, arg.deadline_at),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
    },
  })
}

/** 결정: 선택한 선택지(들)로 정리완료 */
export function useDecideBox(boxId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (optionIds: string[]) => decideBox(boxId, optionIds),
    // 낙관적으로 선택지 캐시에 decided_at을 찍어, 상자가 정리완료로 바뀌는 순간
    // 히어로가 "결정 없이 마무리됐어요"로 잠깐 깜빡이는 것을 막는다.
    onMutate: async (optionIds) => {
      await queryClient.cancelQueries({ queryKey: ['options', boxId] })
      const prev = queryClient.getQueryData<Option[]>(['options', boxId])
      const now = new Date().toISOString()
      queryClient.setQueryData<Option[]>(['options', boxId], old =>
        old?.map(o => (optionIds.includes(o.id) ? { ...o, decided_at: now } : o)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['options', boxId], ctx.prev)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })
      // 홈·목록(서버 컴포넌트) Router Cache 무효화 — 결정 후 뒤로가기 stale 방지.
      router.refresh()
    },
  })
}

/** 마감 투표 자동 결정 (lazy commit) */
export function useAutoDecideBox(boxId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => autoDecideBox(boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })
      router.refresh()
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
      router.replace('/') // 삭제된 상자로 back하면 리다이렉트 루프 → 교체
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
      router.replace('/') // 나간 상자로 back하면 '참여자 아님→/' 리다이렉트 루프 → 교체
    },
  })
}

export function useReopenBox(boxId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reopenBox(boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })  // 번복 시 decided_at 해제 반영
      // 홈·목록은 서버 컴포넌트라 TanStack 무효화로는 안 갱신됨. Router Cache를 비워 뒤로가기 stale 방지.
      router.refresh()
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
