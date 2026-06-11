export type BoxStatus = 'OPEN' | 'SHOWDOWN' | 'EXPIRED' | 'RESOLVED'

export function getBoxStatus(box: {
  deadline_at: string
  closed_at: string | null
  current_round: number
}): BoxStatus {
  if (box.closed_at) return 'RESOLVED'
  if (new Date(box.deadline_at) < new Date()) return 'EXPIRED'
  if (box.current_round > 1) return 'SHOWDOWN'
  return 'OPEN'
}

export function isMessyStatus(status: BoxStatus): boolean {
  return status === 'OPEN' || status === 'SHOWDOWN'
}

export function isDoneStatus(status: BoxStatus): boolean {
  return status === 'RESOLVED' || status === 'EXPIRED'
}
