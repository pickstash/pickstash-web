'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNav } from '@/lib/nav/nav'
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
import { setBoxFolders } from '@/lib/api/folders'
import type { Option } from '@/lib/api/options'

// 상자를 보여주는 모든 화면의 캐시를 무효화 — 제목·상태 변경이 뒤로가기 시 즉시 반영되게.
// 웹 목록(['boxes']) + 토스 홈(['home'])·상자탭(['box-list',*])·서랍(['folder-view',*],['folders']).
// (해당 키가 없는 플랫폼에선 no-op이라 웹·토스 모두 안전.)
function invalidateBoxViews(qc: QueryClient, boxId?: string) {
  qc.invalidateQueries({ queryKey: ['boxes'] })
  qc.invalidateQueries({ queryKey: ['home'] })
  qc.invalidateQueries({ queryKey: ['box-list'] })
  qc.invalidateQueries({ queryKey: ['folder-view'] })
  qc.invalidateQueries({ queryKey: ['folders'] })
  if (boxId) qc.invalidateQueries({ queryKey: ['box', boxId] })
}

export function useCreateBox() {
  const nav = useNav()
  const queryClient = useQueryClient()

  return useMutation({
    // folderId가 있으면(서랍 상세에서 생성) 그 서랍에 바로 담는다. 트리거가 서랍 멤버 전원을 이 상자에 참여시킨다.
    mutationFn: (vars: { input: CreateBoxInput; folderId?: string }) => createBox(vars.input),
    onSuccess: async (box, vars) => {
      if (vars.folderId) {
        try { await setBoxFolders(box.id, [vars.folderId]) } catch { /* 연결 실패해도 상자 자체는 생성됨 */ }
        queryClient.invalidateQueries({ queryKey: ['folders'] })
      }
      invalidateBoxViews(queryClient)
      nav.push(`/box/${box.id}`)
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
      invalidateBoxViews(queryClient, boxId)
    },
  })
}

export function useUpdateBoxMemo(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memo: string | null) => updateBoxMemo(boxId, memo),
    onSuccess: () => {
      invalidateBoxViews(queryClient, boxId)
    },
  })
}

export function useUpdateBoxDeadline(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deadline_at: string | null) => updateBoxDeadline(boxId, deadline_at),
    onSuccess: () => {
      invalidateBoxViews(queryClient, boxId)
    },
  })
}

export function useUpdateBoxDecisionMode(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arg: { mode: DecisionMode; deadline_at: string | null }) =>
      updateBoxDecisionMode(boxId, arg.mode, arg.deadline_at),
    onSuccess: () => {
      invalidateBoxViews(queryClient, boxId)
    },
  })
}

/** 결정: 선택한 선택지(들)로 정리완료 */
export function useDecideBox(boxId: string) {
  const nav = useNav()
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
      invalidateBoxViews(queryClient, boxId)
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })
      // 홈·목록(서버 컴포넌트) Router Cache 무효화 — 결정 후 뒤로가기 stale 방지.
      nav.refresh()
    },
  })
}

/** 마감 투표 자동 결정 (lazy commit) */
export function useAutoDecideBox(boxId: string) {
  const nav = useNav()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => autoDecideBox(boxId),
    onSuccess: () => {
      invalidateBoxViews(queryClient, boxId)
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })
      nav.refresh()
    },
  })
}

export function useDeleteBox() {
  const nav = useNav()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (boxId: string) => deleteBox(boxId),
    onSuccess: () => {
      invalidateBoxViews(queryClient)
      nav.replace('/') // 삭제된 상자로 back하면 리다이렉트 루프 → 교체
    },
  })
}

export function useLeaveBox() {
  const nav = useNav()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (boxId: string) => leaveBox(boxId),
    onSuccess: () => {
      invalidateBoxViews(queryClient)
      nav.replace('/') // 나간 상자로 back하면 '참여자 아님→/' 리다이렉트 루프 → 교체
    },
  })
}

export function useReopenBox(boxId: string) {
  const nav = useNav()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => reopenBox(boxId),
    onSuccess: () => {
      invalidateBoxViews(queryClient, boxId)
      queryClient.invalidateQueries({ queryKey: ['options', boxId] })  // 번복 시 decided_at 해제 반영
      // 홈·목록은 서버 컴포넌트라 TanStack 무효화로는 안 갱신됨. Router Cache를 비워 뒤로가기 stale 방지.
      nav.refresh()
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
