/** catch(e)에서 사람이 읽을 메시지를 뽑는다. Supabase(PostgrestError 등)는 Error 인스턴스가 아니라
 * `e instanceof Error` 체크만으로는 서버가 던진 구체적인 사유(예: RPC raise exception 메시지)가
 * 항상 fallback으로 뭉개진다 — message 속성이 있으면 그걸 우선한다. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message
  }
  return fallback
}

export function formatKoreanDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))
}

/** 댓글 등 상대 시간 표시: 방금 전/N분 전/N시간 전/N일 전, 7일 이후는 날짜로 폴백 */
export function formatRelativeTime(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diffSec < 60) return '방금 전'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}일 전`
  return formatKoreanDate(dateStr)
}

export function formatKoreanDateTime(dateStr: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

/** 마감 없는 상자(null)를 포함한 마감일 표시 */
export function formatDeadline(dateStr: string | null): string {
  return dateStr ? formatKoreanDateTime(dateStr) : '마감 없음'
}

/** 마감까지 남은 날짜를 짧게 (D-day/D-N/마감 지남). 날짜 경계 기준(시간 무시). */
export function formatDday(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  if (diffDays < 0) return '마감 지남'
  if (diffDays === 0) return 'D-day'
  return `D-${diffDays}`
}

/** YYYY.MM.DD HH:mm (로컬 시간) — 공간 절약형 마감일 표시 */
export function formatDeadlineCompact(dateStr: string): string {
  const d = new Date(dateStr)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function toDateInput(date: Date): string {
  return date.toLocaleDateString('sv-SE') // YYYY-MM-DD
}

export function toTimeInput(date: Date): string {
  return date.toTimeString().slice(0, 5) // HH:MM
}

/** 마감일 기본값 = 지금으로부터 1시간 뒤 (오늘 날짜 + 현재시각+1h) */
export function defaultDeadline(): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 10)  // 현재 시각 + 10분
  return d
}
