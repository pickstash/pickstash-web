export function formatKoreanDate(dateStr: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateStr))
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
  d.setHours(d.getHours() + 1)
  return d
}
