'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  getOptions,
  getOption,
  createOption,
  updateOption,
  deleteOption,
  type CreateOptionInput,
  type UpdateOptionInput,
} from '@/lib/api/options'

export function useOptions(boxId: string) {
  return useQuery({
    queryKey: ['options', boxId],
    queryFn: () => getOptions(boxId),
    enabled: !!boxId,
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
  const router = useRouter()
  return useMutation({
    mutationFn: (input: CreateOptionInput) => createOption(input),
    onSuccess: (option) => {
      qc.invalidateQueries({ queryKey: ['options', boxId] })
      qc.invalidateQueries({ queryKey: ['box', boxId] })
      // replace: 추가 폼(/new)을 히스토리에서 교체 — 새 선택지 상세에서 뒤로가기 시 빈 폼으로 안 돌아가게
      router.replace(`/box/${boxId}/option/${option.id}`)
    },
  })
}

export function useUpdateOption(optionId: string, boxId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateOptionInput) => updateOption(optionId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['option', optionId] })
      qc.invalidateQueries({ queryKey: ['options', boxId] })
    },
  })
}

export function useDeleteOption(boxId: string) {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (optionId: string) => deleteOption(optionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['options', boxId] })
      // replace: 삭제된 선택지 상세로 back하면 빈 화면/리다이렉트가 되므로 히스토리에서 교체
      router.replace(`/box/${boxId}`)
    },
  })
}
