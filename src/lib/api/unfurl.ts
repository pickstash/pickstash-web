// 링크 미리보기 조회 — 자체 Route Handler(/api/unfurl) 호출. Supabase 아님.

export interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

/** URL의 OG 미리보기를 가져온다. 실패해도 던지지 않고 url만 담아 반환(폴백=일반 링크). */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  try {
    const res = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`)
    if (!res.ok) return { url }
    const data = (await res.json()) as LinkPreview
    return { ...data, url }
  } catch {
    return { url }
  }
}
