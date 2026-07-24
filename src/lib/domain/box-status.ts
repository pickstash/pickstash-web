// v2(2026-07-24): 상태는 closed_at 하나로 2종만 파생 (정리중/정리완료).
// EXPIRED/SHOWDOWN·시간만료 자동결정·재투표는 폐기.
export type BoxStatus = 'OPEN' | 'RESOLVED'  // 정리중 / 정리완료

export function getBoxStatus(box: { closed_at: string | null }): BoxStatus {
  return box.closed_at ? 'RESOLVED' : 'OPEN'  // 정리완료 / 정리중
}

/** 정리상태 라벨 2종 — 카드마다 정확히 1개 표시 (spec §3-6) */
export const BOX_STATUS_LABEL: Record<BoxStatus, string> = {
  RESOLVED: '정리완료!',
  OPEN: '정리 미완료',
}

export function isMessyStatus(status: BoxStatus): boolean {
  return status === 'OPEN'
}

export function isDoneStatus(status: BoxStatus): boolean {
  return status === 'RESOLVED'
}
