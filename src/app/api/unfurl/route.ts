import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeFetch as safeFetchWithRedirects } from '@/lib/server/safe-fetch'

// 링크 미리보기(OG 언퍼) — 웹 전용 유틸(외부 URL의 메타 태그를 서버에서 긁어온다).
// RN은 이 HTTP 엔드포인트를 그대로 호출해 재사용한다.
// SSRF 방지: 로그인 세션 필수 + http(s)만 + 호스트를 DNS로 해석해 모든 IP가 공인인지 검증
//            + 리다이렉트 매 홉 재검증 + 바이트·시간 상한 (src/lib/server/safe-fetch.ts).
// 잔여 위험: 능동적 DNS 리바인딩(해석 시점과 연결 시점 IP가 달라지는 경우)은 완전히는
//            막지 못한다 — 인증 게이트로 축소. 필요 시 소켓 IP 피닝(undici Agent) 추가.

export const runtime = 'nodejs'

const TIMEOUT_MS = 5000
const MAX_BYTES = 512 * 1024 // <head> 파싱엔 충분
const MAX_REDIRECTS = 4

export interface UnfurlResult {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function pickMeta(head: string, prop: string): string | undefined {
  const re1 = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`, 'i')
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`, 'i')
  const m = head.match(re1) || head.match(re2)
  const v = m?.[1] ? decodeEntities(m[1]).trim() : ''
  return v || undefined
}

function safeFetch(startUrl: string, signal: AbortSignal): Promise<Response | null> {
  return safeFetchWithRedirects(
    startUrl,
    signal,
    { 'User-Agent': 'PickstashBot/1.0 (+link preview)', Accept: 'text/html,application/xhtml+xml' },
    MAX_REDIRECTS
  )
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader()
  if (!reader) return ''
  const chunks: Uint8Array[] = []
  let total = 0
  while (total < maxBytes) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      total += value.length
    }
  }
  reader.cancel().catch(() => {})
  const merged = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    merged.set(c.subarray(0, Math.min(c.length, maxBytes - offset)), offset)
    offset += c.length
    if (offset >= maxBytes) break
  }
  return new TextDecoder('utf-8').decode(merged)
}

export async function GET(request: Request) {
  // 인증 게이트 — 로그인 유저만 (미인증 오픈 프록시/포트스캔 악용 차단)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const target = new URL(request.url).searchParams.get('url')
  if (!target) {
    return NextResponse.json({ error: 'missing url' }, { status: 400 })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await safeFetch(target, controller.signal)
    if (!res || !res.ok) {
      return NextResponse.json({ url: target } satisfies UnfurlResult, { status: 200 })
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html') && !contentType.includes('xml')) {
      return NextResponse.json({ url: target } satisfies UnfurlResult, { status: 200 })
    }

    const html = await readCapped(res, MAX_BYTES)
    const finalUrl = res.url || target

    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
    const rawTitle = pickMeta(html, 'og:title') ?? (titleTag ? decodeEntities(titleTag).trim() || undefined : undefined)
    const rawImage = pickMeta(html, 'og:image') ?? pickMeta(html, 'twitter:image')
    let image: string | undefined
    if (rawImage) {
      try {
        const abs = new URL(rawImage, finalUrl)
        image = abs.protocol === 'http:' || abs.protocol === 'https:' ? abs.toString() : undefined
      } catch {
        image = undefined
      }
    }

    const result: UnfurlResult = {
      url: target,
      title: rawTitle,
      description: pickMeta(html, 'og:description') ?? pickMeta(html, 'description'),
      image,
      siteName: pickMeta(html, 'og:site_name'),
    }
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=86400' },
    })
  } catch {
    return NextResponse.json({ url: target } satisfies UnfurlResult, { status: 200 })
  } finally {
    clearTimeout(timer)
  }
}
