// 선택지 본문 "블록-라이트" 모델 + 파생 — 프레임워크·API 의존성 없는 순수 로직.
// 블록: 글 / 사진 / 링크(OG 미리보기 포함) / 유튜브 영상. spec 7-5/7-6.

export type LinkKind = 'link' | 'map' | 'youtube'

export const LINK_KINDS: { kind: LinkKind; emoji: string; label: string }[] = [
  { kind: 'link', emoji: '🔗', label: '링크' },
  { kind: 'map', emoji: '📍', label: '지도' },
  { kind: 'youtube', emoji: '▶️', label: '유튜브' },
]

export type OptionBlock =
  | { type: 'text'; id: string; text: string }
  | { type: 'image'; id: string; url: string }
  | {
      type: 'link'
      id: string
      url: string
      label: string
      icon?: LinkKind
      title?: string
      description?: string
      image?: string
    }

export type LinkBlock = Extract<OptionBlock, { type: 'link' }>

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
        if (url) {
          const iconRaw = readString(obj, 'icon')
          blocks.push({
            type: 'link',
            id,
            url,
            label: readString(obj, 'label') ?? '',
            icon: LINK_KINDS.some(k => k.kind === iconRaw) ? (iconRaw as LinkKind) : undefined,
            title: readString(obj, 'title'),
            description: readString(obj, 'description'),
            image: readString(obj, 'image'),
          })
        }
        break
      }
    }
  }
  return blocks
}

/** 제출 전 정리: 빈 글/빈 URL/파싱 불가 영상 블록 제거. 원본 불변. */
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

function truncate(s: string, maxLen: number): string {
  const t = s.trim().replace(/\s+/g, ' ')
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
}

export interface OptionPreview {
  image?: string
  snippet?: string
}

/** 카드 미리보기: 첫 사진(없으면 링크 썸네일/영상 썸네일) + 첫 글(없으면 링크 제목). */
export function getOptionPreview(blocks: OptionBlock[], maxLen = 60): OptionPreview {
  let image: string | undefined
  let snippet: string | undefined
  for (const b of blocks) {
    if (!image) {
      if (b.type === 'image') image = b.url
      else if (b.type === 'link') {
        if (b.image) image = b.image
        else {
          const id = parseYouTubeId(b.url)
          if (id) image = youTubeThumb(id)
        }
      }
    }
    if (!snippet) {
      if (b.type === 'text' && b.text.trim()) snippet = truncate(b.text, maxLen)
      else if (b.type === 'link' && b.title) snippet = truncate(b.title, maxLen)
    }
    if (image && snippet) break
  }
  return { image, snippet }
}

/** 링크 라벨이 비었으면 OG 제목 → 도메인명 순으로 대체 표시. */
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

/** 유튜브 URL에서 영상 ID를 추출한다(watch/youtu.be/embed/shorts/live). 실패 시 null. */
export function parseYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?(?:[^&]*&)*v=)([\w-]{11})/i,
    /(?:youtu\.be\/)([\w-]{11})/i,
    /(?:youtube\.com\/(?:embed|shorts|live)\/)([\w-]{11})/i,
  ]
  for (const re of patterns) {
    const m = url.match(re)
    if (m) return m[1]
  }
  return null
}

export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}

export function youTubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

/** URL 도메인으로 링크 종류를 추정한다(사용자가 아이콘을 안 골랐을 때 기본값). */
export function detectLinkKind(url: string): LinkKind {
  let host = ''
  try {
    host = new URL(linkHref(url)).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'link'
  }
  if (/(youtube\.com|youtu\.be)/.test(host)) return 'youtube'
  if (/(map\.kakao|place\.map\.kakao|map\.naver|maps\.google|maps\.app\.goo\.gl|naver\.me|kko\.to)/.test(host)) return 'map'
  return 'link'
}

/** 링크 블록의 종류 = 사용자가 고른 아이콘 우선, 없으면 URL로 추정. */
export function linkKindOf(link: { url: string; icon?: LinkKind }): LinkKind {
  return link.icon ?? detectLinkKind(link.url)
}

export function linkKindEmoji(kind: LinkKind): string {
  return LINK_KINDS.find(k => k.kind === kind)?.emoji ?? '🔗'
}

/** 블록 목록에서 링크 블록만 골라낸다(상자 링크 모아보기용). */
export function linkBlocksOf(blocks: OptionBlock[]): LinkBlock[] {
  return blocks.filter((b): b is LinkBlock => b.type === 'link')
}
