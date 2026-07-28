'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMyFolders,
  createFolder,
  renameFolder,
  deleteFolder,
  getMyBoxFolderId,
  setBoxFolder,
  reorderBoxFolders,
} from '@/lib/api/folders'

export function useFolders() {
  return useQuery({ queryKey: ['folders'], queryFn: getMyFolders })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createFolder(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useRenameFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arg: { id: string; name: string }) => renameFolder(arg.id, arg.name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  })
}

export function useDeleteFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['boxFolder'] }) // 삭제된 폴더에 있던 상자들 미분류로
    },
  })
}

/** 내가 이 상자를 넣어둔 폴더 id (없으면 null) */
export function useMyBoxFolder(boxId: string) {
  return useQuery({
    queryKey: ['boxFolder', boxId],
    queryFn: () => getMyBoxFolderId(boxId),
    enabled: !!boxId,
  })
}

/** 상자를 내 폴더에 넣기/빼기 (folderId=null이면 미분류) */
export function useSetBoxFolder(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (folderId: string | null) => setBoxFolder(boxId, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxFolder', boxId] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

/** 편집 모드: 상자를 이 폴더에서 제외 (boxId 인자형). */
export function useRemoveBoxFromFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (boxId: string) => setBoxFolder(boxId, null),
    onSuccess: (_d, boxId) => {
      queryClient.invalidateQueries({ queryKey: ['boxFolder', boxId] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

/** 편집 모드: 폴더 안 상자 순서 저장 ('완료' 시 orderedBoxIds로 일괄 반영). */
export function useReorderFolderBoxes(folderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderedBoxIds: string[]) => reorderBoxFolders(folderId, orderedBoxIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['folders'] }),
  })
}
