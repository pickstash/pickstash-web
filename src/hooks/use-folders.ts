'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMyFolders,
  createFolder,
  renameFolder,
  leaveFolder,
  getMyBoxFolderIds,
  setBoxFolders,
  removeBoxFromFolder,
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

/** 폴더 나가기(멤버십 제거). 혼자면=삭제(마지막 나감→자동 소멸). leaveBoxes면 그 폴더 상자에서도 나감. */
export function useLeaveFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arg: { folderId: string; leaveBoxes?: boolean }) => leaveFolder(arg.folderId, arg.leaveBoxes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['boxFolder'] })
    },
  })
}

/** 내가 이 상자를 넣어둔 폴더 id 목록 (018 다중 포함. 미분류면 빈 배열) */
export function useMyBoxFolders(boxId: string) {
  return useQuery({
    queryKey: ['boxFolder', boxId],
    queryFn: () => getMyBoxFolderIds(boxId),
    enabled: !!boxId,
  })
}

/** 상자가 속할 내 폴더 집합을 folderIds로 맞추기 (018 다중 선택) */
export function useSetBoxFolders(boxId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (folderIds: string[]) => setBoxFolders(boxId, folderIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxFolder', boxId] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })
    },
  })
}

/** 편집 모드: 상자를 특정 폴더에서만 제외 */
export function useRemoveBoxFromFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arg: { boxId: string; folderId: string }) => removeBoxFromFolder(arg.boxId, arg.folderId),
    onSuccess: (_d, arg) => {
      queryClient.invalidateQueries({ queryKey: ['boxFolder', arg.boxId] })
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
