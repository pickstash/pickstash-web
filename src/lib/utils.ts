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

export function toDateInput(date: Date): string {
  return date.toLocaleDateString('sv-SE') // YYYY-MM-DD
}

export function toTimeInput(date: Date): string {
  return date.toTimeString().slice(0, 5) // HH:MM
}

export function defaultDeadline(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d
}
