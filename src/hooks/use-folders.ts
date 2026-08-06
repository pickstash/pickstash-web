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
  getMyBoxesNotInFolder,
  addBoxesToFolder,
} from '@/lib/api/folders'
import { getCoParticipantsForFolder, inviteUsersToFolder } from '@/lib/api/folder-invites'

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

/** 서랍 상세 '기존 상자 담기' — 담을 후보(이 폴더에 아직 없는 내 상자). */
export function useBoxesNotInFolder(folderId: string, enabled = true) {
  return useQuery({
    queryKey: ['boxes-not-in-folder', folderId],
    queryFn: () => getMyBoxesNotInFolder(folderId),
    enabled: enabled && !!folderId,
  })
}

/** 기존 상자(들)를 이 폴더에 담기 */
export function useAddBoxesToFolder(folderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (boxIds: string[]) => addBoxesToFolder(folderId, boxIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes-not-in-folder', folderId], refetchType: 'all' })
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

/** '함께했던 사람' 초대 후보(이 서랍에 아직 없는 과거 공동 참여자). 시트 열렸을 때만 조회. */
export function useCoParticipantsForFolder(folderId: string, enabled = true) {
  return useQuery({
    queryKey: ['co-participants-folder', folderId],
    queryFn: () => getCoParticipantsForFolder(folderId),
    enabled: enabled && !!folderId,
  })
}

/** 고른 사람들을 이 서랍에 바로 추가(+초대 푸시). 초대 즉시 서랍 뷰가 갱신되게 무효화. */
export function useInviteUsersToFolder(folderId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userIds: string[]) => inviteUsersToFolder(folderId, userIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['co-participants-folder', folderId], refetchType: 'all' })
      invalidateFolderViews(queryClient)
    },
  })
}
