export type BoxStatus = 'OPEN' | 'SHOWDOWN' | 'EXPIRED' | 'RESOLVED'

export function getBoxStatus(box: {
  deadline_at: string | null
  closed_at: string | null
  current_round: number
}): BoxStatus {
  if (box.closed_at) return 'RESOLVED'
  if (box.deadline_at && new Date(box.deadline_at) < new Date()) return 'EXPIRED'
  if (box.current_round > 1) return 'SHOWDOWN'
  return 'OPEN'
}

/** 정리상태 라벨 4종 — 카드마다 정확히 1개 표시 (spec 3-2) */
export const BOX_STATUS_LABEL: Record<BoxStatus, string> = {
  RESOLVED: '정리완료!',
  EXPIRED: '시간 만료',
  SHOWDOWN: '결판 중',
  OPEN: '정리 미완료',
}

export function isMessyStatus(status: BoxStatus): boolean {
  return status === 'OPEN' || status === 'SHOWDOWN'
}

export function isDoneStatus(status: BoxStatus): boolean {
  return status === 'RESOLVED' || status === 'EXPIRED'
}
