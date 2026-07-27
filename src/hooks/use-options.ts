'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  getOptions,
  getOption,
  createOption,
  createOptionsFromText,
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
      router.push(`/box/${boxId}/option/${option.id}`)
    },
  })
}

/** 링크 붙여넣기 → 선택지 자동 생성 (여러 개 한 번에). 성공 시 목록 새로고침, 페이지 이동 없음. */
export function useQuickAddOptions(boxId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => createOptionsFromText(boxId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['options', boxId] })
      qc.invalidateQueries({ queryKey: ['box', boxId] })
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
      router.push(`/box/${boxId}`)
    },
  })
}
