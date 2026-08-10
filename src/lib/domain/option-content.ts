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
  /**
   * 링크 메모(라벨). 스니펫이 "링크 제목"에서 왔을 때만 함께 노출한다.
   * 더 상단에 글 블록이 있어 그 글이 스니펫을 차지하면 메모는 생략된다.
   */
  memo?: string
}

/** 카드 미리보기: 첫 사진(없으면 링크 썸네일/영상 썸네일) + 첫 글(없으면 링크 제목 + 메모). */
export function getOptionPreview(blocks: OptionBlock[], maxLen = 60): OptionPreview {
  // 카드 썸네일은 '직접 올린 사진'을 우선한다 — 링크 OG 이미지(지도 아이콘 등 대체 이미지 포함)보다
  // 사용자가 붙인 사진이 더 나은 대표 이미지. 순서를 바꾸지 않아도 사진이 썸네일로 잡힌다.
  // 사진이 없을 때만 링크 OG 이미지 / 유튜브 썸네일로 폴백(블록 순서상 첫 번째).
  let image = blocks.find((b): b is Extract<OptionBlock, { type: 'image' }> => b.type === 'image')?.url
  if (!image) {
    for (const b of blocks) {
      if (b.type !== 'link') continue
      if (b.image) { image = b.image; break }
      const id = parseYouTubeId(b.url)
      if (id) { image = youTubeThumb(id); break }
    }
  }

  let snippet: string | undefined
  let memo: string | undefined
  for (const b of blocks) {
    if (!snippet) {
      if (b.type === 'text' && b.text.trim()) {
        snippet = truncate(b.text, maxLen)
      } else if (b.type === 'link' && b.title) {
        snippet = truncate(b.title, maxLen)
        // 링크에서 스니펫이 왔을 때만 그 링크의 메모(라벨)를 함께 노출. 제목과 같으면 중복이라 생략.
        const label = b.label.trim()
        if (label && label !== b.title.trim()) memo = truncate(label, maxLen)
      }
    }
    if (snippet) break
  }
  return { image, snippet, memo }
}

/** OG 제목을 못 가져왔을 때 표시할 대체 제목(도메인명). 메모(라벨)는 별개로 표시하므로 여기 섞지 않는다. */
export function linkFallbackTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * "라벨 https://..." 처럼 URL이 다른 텍스트에 섞여 붙여넣어졌을 때 URL과 라벨을 분리한다.
 * (공유 버튼이 "네이버 https://www.naver.com/" 형태로 복사해주는 경우 대응)
 * - 텍스트 안 첫 URL(http/https 또는 www.)을 추출, 끝 구두점 제거.
 * - URL을 뺀 나머지를 라벨 후보로 정리.
 * - URL이 없으면 null.
 */
// 링크로 오인하면 안 되는 흔한 파일 확장자(코드·문서·미디어). 경로 없는 맨 "이름.확장자" 오탐 방지.
const FILE_EXT_RE =
  /\.(tsx?|jsx?|mjs|cjs|py|rb|go|rs|java|kt|swift|php|c|cpp|cc|h|hpp|css|scss|sass|less|html?|xml|json|ya?ml|toml|ini|env|sh|sql|md|mdx|txt|csv|tsv|log|pdf|docx?|xlsx?|pptx?|hwp|zip|tar|gz|rar|7z|dmg|exe|apk|png|jpe?g|gif|svg|webp|ico|bmp|mp[34]|m4a|mov|avi|mkv|webm)$/i

export function splitPastedLink(raw: string): { url: string; label: string } | null {
  const text = raw.trim()
  if (!text) return null

  // 1) 명시적 URL(http(s):// 또는 www.)은 큰 텍스트에 섞여 있어도 추출하고 나머지를 라벨로.
  //    (공유 버튼이 "네이버 https://www.naver.com/"처럼 복사해주는 경우 대응)
  const explicit = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i)
  if (explicit && explicit.index !== undefined) {
    const url = explicit[0].replace(/[.,;:)\]}"'»]+$/, '') // 끝 구두점 제거
    const label = (text.slice(0, explicit.index) + text.slice(explicit.index + explicit[0].length))
      .replace(/\s+/g, ' ')
      .trim()
    return { url, label }
  }

  // 2) 스킴 없는 도메인(naver.com, coupang.com/vp/...)을 텍스트 '어느 토큰이든'에서 찾는다.
  //    (예: "네이버 최저가 coupang.com/vp/...") — 파일명(option-form.tsx)·문장 단어 오탐은 FILE_EXT_RE로 막는다.
  //    경로(/)가 있으면 확실한 링크로 보고, 경로 없는 맨 도메인만 파일확장자 검사를 적용.
  const domainRe = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s]*)?$/i
  const tokens = text.split(/\s+/)
  for (const tok of tokens) {
    const bare = tok.replace(/^[("'«]+/, '').replace(/[.,;:)\]}"'»]+$/, '')
    if (!domainRe.test(bare)) continue
    if (!bare.includes('/') && FILE_EXT_RE.test(bare)) continue // 경로 없는 word.ext → 파일명 오탐
    const label = tokens.filter(t => t !== tok).join(' ').replace(/\s+/g, ' ').trim()
    return { url: bare, label }
  }

  return null
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

export function linkKindLabel(kind: LinkKind): string {
  return LINK_KINDS.find(k => k.kind === kind)?.label ?? '링크'
}

/** 블록 목록에서 링크 블록만 골라낸다(상자 링크 모아보기용). */
export function linkBlocksOf(blocks: OptionBlock[]): LinkBlock[] {
  return blocks.filter((b): b is LinkBlock => b.type === 'link')
}
