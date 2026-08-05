'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
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

// 서랍을 보여주는 모든 화면 캐시 무효화 — 생성·삭제·이름변경이 뒤로가기 시 즉시 반영되게.
// FolderChips(홈, ['folders']) + 토스 서랍 목록(['folders-page']) + 서랍 상세(['folder-view',*]).
// refetchType:'all' — 담을 당시 서랍 화면은 비활성(안 마운트)이라, 기본값이면 stale 표시만 되고
// staleTime(60s) 캐시가 남아 다시 들어가도 옛 데이터가 보인다. 비활성 쿼리도 즉시 refetch시켜 최신화.
function invalidateFolderViews(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['folders'], refetchType: 'all' })
  qc.invalidateQueries({ queryKey: ['folders-page'], refetchType: 'all' })
  qc.invalidateQueries({ queryKey: ['folder-view'], refetchType: 'all' })
}

export function useFolders() {
  return useQuery({ queryKey: ['folders'], queryFn: getMyFolders })
}

export function useCreateFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createFolder(name),
    onSuccess: () => invalidateFolderViews(queryClient),
  })
}

export function useRenameFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arg: { id: string; name: string }) => renameFolder(arg.id, arg.name),
    onSuccess: () => invalidateFolderViews(queryClient),
  })
}

/** 폴더 나가기(멤버십 제거). 혼자면=삭제(마지막 나감→자동 소멸). leaveBoxes면 그 폴더 상자에서도 나감. */
export function useLeaveFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arg: { folderId: string; leaveBoxes?: boolean }) => leaveFolder(arg.folderId, arg.leaveBoxes),
    onSuccess: () => {
      invalidateFolderViews(queryClient)
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
      invalidateFolderViews(queryClient)
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
      invalidateFolderViews(queryClient)
    },
  })
}

/** 편집 모드: 폴더 안 상자 순서 저장 ('완료' 시 orderedBoxIds로 일괄 반영). */
export function useReorderFolderBoxes(folderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderedBoxIds: string[]) => reorderBoxFolders(folderId, orderedBoxIds),
    onSuccess: () => invalidateFolderViews(queryClient),
  })
}
