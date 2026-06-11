'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  createBox,
  getBox,
  getMessyBoxes,
  updateBoxTitle,
  updateBoxDeadline,
  closeBox,
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

export function useUpdateBoxDeadline(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (deadline_at: string) => updateBoxDeadline(boxId, deadline_at),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
    },
  })
}

export function useCloseBox(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => closeBox(boxId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['box', boxId] })
      queryClient.invalidateQueries({ queryKey: ['boxes'] })
    },
  })
}
