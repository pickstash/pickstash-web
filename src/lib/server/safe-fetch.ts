// SSRF 방지 공용 유틸 — /api/unfurl, /api/unfurl/image가 공유한다.
// 호스트를 DNS로 해석해 모든 IP가 공인인지 검증 + 리다이렉트 매 홉 재검증.
// 잔여 위험: 능동적 DNS 리바인딩(해석 시점과 연결 시점 IP가 달라지는 경우)은 완전히는
//            막지 못한다 — 인증 게이트로 축소.

import { lookup as dnsLookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/** 사설/루프백/링크로컬/ULA/CGNAT/예약 IP인지 (v4·v6, IPv4-mapped 포함). */
export function isPrivateAddress(ip: string): boolean {
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1]
  const v = mapped ?? ip
  if (isIP(v) === 4) {
    const [a, b] = v.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) || // 링크로컬 + 클라우드 메타데이터
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      a >= 224 // multicast/reserved
    )
  }
  const h = v.toLowerCase()
  if (h === '::1' || h === '::') return true
  if (h.startsWith('fc') || h.startsWith('fd')) return true // ULA fc00::/7
  if (/^fe[89ab]/.test(h)) return true // 링크로컬 fe80::/10
  return false
}

/** 호스트가 공인 주소로만 해석되는지 검증. 리터럴 IP도 직접 검사. 하나라도 사설이면 throw. */
export async function assertPublicHost(u: URL): Promise<void> {
  const host = u.hostname.replace(/^\[|\]$/g, '')
  let addresses: string[]
  if (isIP(host)) {
    addresses = [host]
  } else {
    const resolved = await dnsLookup(host, { all: true, verbatim: true })
    addresses = resolved.map(r => r.address)
  }
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('blocked host')
  }
}

/** 매 홉 SSRF 재검증하며 리다이렉트를 직접 따라간다. 요청 헤더는 호출부가 지정. */
export async function safeFetch(
  startUrl: string,
  signal: AbortSignal,
  headers: Record<string, string>,
  maxRedirects = 4
): Promise<Response | null> {
  let current = startUrl
  for (let i = 0; i <= maxRedirects; i++) {
    let u: URL
    try {
      u = new URL(current)
    } catch {
      return null
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    try {
      await assertPublicHost(u)
    } catch {
      return null
    }

    const res = await fetch(current, { redirect: 'manual', signal, headers })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location')
      if (!loc) return res
      current = new URL(loc, current).toString() // 다음 루프에서 호스트 재검증
      continue
    }
    return res
  }
  return null
}
