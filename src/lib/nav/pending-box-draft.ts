import type { BoxMode } from '@/lib/api/boxes'

// 홈 빈 상태 '추천 템플릿' → 상자 만들기 폼으로 제목·종류를 미리 채워 넘기는 채널.
// pending-box-folder.ts와 동일한 이유(토스 MemoryRouter는 쿼리스트링을 공유 폼에서 못 읽음)로 모듈 변수 1회성 전달.
export interface PendingBoxDraft {
  title?: string
  mode?: BoxMode // 'checklist' 템플릿(리스트류)은 종류까지 프리셋
}

let pending: PendingBoxDraft | null = null

export function setPendingBoxDraft(draft: PendingBoxDraft | null): void {
  pending = draft
}

/** 값을 읽고 즉시 비운다(1회성). 폼 마운트 시 한 번만 소비. */
export function takePendingBoxDraft(): PendingBoxDraft | null {
  const v = pending
  pending = null
  return v
}
