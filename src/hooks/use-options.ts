'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNav } from '@/lib/nav/nav'
import {
  getOptions,
  getOption,
  createOption,
  updateOption,
  deleteOption,
  toggleOptionChecked,
  reorderOptions,
  type CreateOptionInput,
  type UpdateOptionInput,
  type OptionWithCounts,
} from '@/lib/api/options'

export function useOptions(boxId: string) {
  return useQuery({
    queryKey: ['options', boxId],
    queryFn: () => getOptions(boxId),
    enabled: !!boxId,
  })
}

/** 모아보기 항목 드래그 정렬 — orderedIds 순서로 저장(RPC). 즉시 반응해야 해 낙관적 반영. */
export function useReorderOptions(boxId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: string[]) => reorderOptions(boxId, orderedIds),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ['options', boxId] })
      const prev = qc.getQueryData<OptionWithCounts[]>(['options', boxId])
      if (prev) {
        const byId = new Map(prev.map(o => [o.id, o]))
        qc.setQueryData<OptionWithCounts[]>(['options', boxId], orderedIds.map(id => byId.get(id)).filter(Boolean) as OptionWithCounts[])
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(['options', boxId], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['options', boxId] }),
  })
}

export function useOption(optionId: string) {
  return useQuery({
    queryKey: ['option', optionId],
    queryFn: () => getOption(optionId),
    enabled: !!optionId,
  })
}

export function useCreateOption(boxId: string) {
  const qc = useQueryClient()
  const nav = useNav()
  return useMutation({
    mutationFn: (input: CreateOptionInput) => createOption(input),
    onSuccess: (option) => {
      // 추가 직후 옵션상세로 이동 → 상자 상세·목록은 비활성. refetchType:'all'로 뒤로가기 시 새 선택지 반영.
      qc.invalidateQueries({ queryKey: ['options', boxId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['box', boxId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['box-detail', boxId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['home'], refetchType: 'all' })
      // replace: 추가 폼(/new)을 히스토리에서 교체 — 새 선택지 상세에서 뒤로가기 시 빈 폼으로 안 돌아가게
      nav.replace(`/box/${boxId}/option/${option.id}`)
    },
  })
}

export function useUpdateOption(optionId: string, boxId: string) {
  const qc = useQueryClient()
  const nav = useNav()
  return useMutation({
    mutationFn: (input: UpdateOptionInput) => updateOption(optionId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['option', optionId] })
      // 토스 옵션상세는 ['option-detail',boxId,optionId] 키를 쓴다 — 이름/메모 수정 반영에 필수.
      qc.invalidateQueries({ queryKey: ['option-detail', boxId, optionId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['options', boxId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['box-detail', boxId], refetchType: 'all' })
      // 상자 상세(웹 서버 컴포넌트)에도 이름이 노출되므로 Router Cache도 비워 즉시 반영.
      nav.refresh()
    },
  })
}

/** 체크형 상자 아이템 체크 토글 — 즉시 반응해야 하는 direct-manipulation이라 낙관적 업데이트. */
export function useToggleOptionChecked(boxId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ optionId, checked }: { optionId: string; checked: boolean }) => toggleOptionChecked(optionId, checked),
    onMutate: async ({ optionId, checked }) => {
      await qc.cancelQueries({ queryKey: ['options', boxId] })
      const prev = qc.getQueryData<OptionWithCounts[]>(['options', boxId])
      qc.setQueryData<OptionWithCounts[]>(['options', boxId], old =>
        old?.map(o => (o.id === optionId ? { ...o, checked_at: checked ? new Date().toISOString() : null } : o))
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['options', boxId], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['options', boxId] })
      qc.invalidateQueries({ queryKey: ['box-detail', boxId], refetchType: 'all' })
    },
  })
}

export function useDeleteOption(boxId: string) {
  const qc = useQueryClient()
  const nav = useNav()
  return useMutation({
    mutationFn: (optionId: string) => deleteOption(optionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['options', boxId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['box-detail', boxId], refetchType: 'all' })
      qc.invalidateQueries({ queryKey: ['home'], refetchType: 'all' })
      // replace: 삭제된 선택지 상세로 back하면 빈 화면/리다이렉트가 되므로 히스토리에서 교체
      nav.replace(`/box/${boxId}`)
    },
  })
}
