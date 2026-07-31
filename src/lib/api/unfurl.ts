// 링크 미리보기 조회 — 웹 전용 Route Handler(/api/unfurl) 호출. Supabase 아님.
// 웹은 동일 오리진 → 상대경로 + 쿠키 세션. 토스(.ait)는 웹 도메인이 아니라 상대경로가 깨지므로,
// 시작 시 configureUnfurl로 웹 백엔드 base + 세션 토큰 게터를 주입한다(main.tsx).

export interface LinkPreview {
  url: string
  title?: string
  description?: string
  image?: string
  siteName?: string
}

// 웹: 미설정(base='') → 상대경로 + 쿠키. 토스: base=웹도메인, getToken=Supabase 세션 토큰.
let cfg: { base: string; getToken?: () => Promise<string | null> } = { base: '' }

export function configureUnfurl(c: { base: string; getToken: () => Promise<string | null> }) {
  cfg = c
}

/** og:image를 서버 프록시로 우회해서 불러온다(핫링크 차단 대응). */
export function proxiedImageUrl(url: string): string {
  // 토스: <img src>는 인증 헤더를 못 실어 크로스오리진 프록시 인증이 불가 → 원본 URL을 직접 로드한다.
  //   대부분의 og:image는 그대로 뜨고, 리퍼러 핫링크 차단 이미지만 깨진다.
  //   ponytail: 핫링크 차단이 실제 문제가 되면 서명 URL 이미지 프록시(토큰 in URL 아님)로 승격.
  if (cfg.base) return url
  return `/api/unfurl/image?url=${encodeURIComponent(url)}`
}

/** URL의 OG 미리보기를 가져온다. 실패해도 던지지 않고 url만 담아 반환(폴백=일반 링크). */
export async function fetchLinkPreview(url: string): Promise<LinkPreview> {
  try {
    const token = cfg.getToken ? await cfg.getToken() : null
    const res = await fetch(`${cfg.base}/api/unfurl?url=${encodeURIComponent(url)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: cfg.base ? 'omit' : 'same-origin',
    })
    if (!res.ok) return { url }
    const data = (await res.json()) as LinkPreview
    return { ...data, url }
  } catch {
    return { url }
  }
}
