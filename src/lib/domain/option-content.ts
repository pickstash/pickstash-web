// 선택지 본문 "블록-라이트" 모델 + 파생 — 프레임워크·API 의존성 없는 순수 로직.
// 사진·글·라벨링크를 순서대로 담는 블록 배열. spec 7-5/7-6.

export type OptionBlock =
  | { type: 'text'; id: string; text: string }
  | { type: 'image'; id: string; url: string }
  | { type: 'link'; id: string; label: string; url: string }

function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key]
  return typeof v === 'string' ? v : undefined
}

/** DB의 jsonb(unknown)를 안전하게 OptionBlock[]로 파싱한다. 형식이 어긋난 항목은 버린다. */
export function parseBlocks(raw: unknown): OptionBlock[] {
  if (!Array.isArray(raw)) return []
  const blocks: OptionBlock[] = []
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (!item || typeof item !== 'object') continue
    const obj = item as Record<string, unknown>
    // id가 없거나 빈 경우 인덱스 기반 폴백 — 손상 데이터에서도 key 충돌/오매칭 방지
    const id = readString(obj, 'id') || `blk-${i}`
    switch (obj.type) {
      case 'text': {
        const text = readString(obj, 'text')
        if (text !== undefined) blocks.push({ type: 'text', id, text })
        break
      }
      case 'image': {
        const url = readString(obj, 'url')
        if (url) blocks.push({ type: 'image', id, url })
        break
      }
      case 'link': {
        const url = readString(obj, 'url')
        if (url) blocks.push({ type: 'link', id, label: readString(obj, 'label') ?? '', url })
        break
      }
    }
  }
  return blocks
}

/** 제출 전 정리: 빈 글/빈 URL 블록 제거. 원본 불변. */
export function cleanBlocks(blocks: OptionBlock[]): OptionBlock[] {
  return blocks
    .map(b => {
      if (b.type === 'text') return { ...b, text: b.text.trim() }
      if (b.type === 'link') return { ...b, label: b.label.trim(), url: b.url.trim() }
      return b
    })
    .filter(b => {
      if (b.type === 'text') return b.text.length > 0
      if (b.type === 'link') return b.url.length > 0
      return true // image
    })
}

export interface OptionPreview {
  image?: string
  snippet?: string
}

/** 카드 미리보기: 첫 사진 + 첫 글 스니펫 (제거된 요약 필드를 대체). */
export function getOptionPreview(blocks: OptionBlock[], maxLen = 60): OptionPreview {
  let image: string | undefined
  let snippet: string | undefined
  for (const b of blocks) {
    if (!image && b.type === 'image') image = b.url
    if (!snippet && b.type === 'text' && b.text.trim()) {
      const t = b.text.trim().replace(/\s+/g, ' ')
      snippet = t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
    }
    if (image && snippet) break
  }
  return { image, snippet }
}

/** 링크 라벨이 비었으면 도메인명을 대체 표시. */
export function linkDisplayLabel(label: string, url: string): string {
  if (label.trim()) return label.trim()
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** 스킴 없는 링크(예: 레거시 "naver.com")에 https://를 붙여 안전한 href로 만든다. */
export function linkHref(url: string): string {
  const u = url.trim()
  if (!u) return u
  if (/^(mailto:|tel:)/i.test(u)) return u
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(u) || u.startsWith('//')) return u
  return `https://${u}`
}
