import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeFetch } from '@/lib/server/safe-fetch'

// 링크 미리보기 이미지 프록시 — 서버에서 대신 받아온다.
// 많은 쇼핑몰·SNS가 og:image를 리퍼러 기준 핫링크 차단하므로, 브라우저가 원본을
// 직접 <img src>로 불러오면 깨진다. 서버 fetch는 리퍼러를 보내지 않아 우회된다.
// SSRF 방지는 /api/unfurl과 동일(src/lib/server/safe-fetch.ts).

export const runtime = 'nodejs'

const TIMEOUT_MS = 5000
const MAX_BYTES = 5 * 1024 * 1024
const MAX_REDIRECTS = 4

export async function GET(request: Request) {
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
    const res = await safeFetch(target, controller.signal, { Accept: 'image/*' }, MAX_REDIRECTS)
    if (!res || !res.ok) {
      return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
    }
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'not an image' }, { status: 502 })
    }
    const contentLength = Number(res.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BYTES) {
      return NextResponse.json({ error: 'too large' }, { status: 502 })
    }

    const reader = res.body?.getReader()
    if (!reader) return NextResponse.json({ error: 'empty body' }, { status: 502 })
    const chunks: Uint8Array[] = []
    let total = 0
    while (total < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        chunks.push(value)
        total += value.length
      }
    }
    reader.cancel().catch(() => {})

    return new NextResponse(Buffer.concat(chunks), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch {
    return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
  } finally {
    clearTimeout(timer)
  }
}
