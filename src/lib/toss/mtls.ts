import https from 'node:https'

// 토스 파트너 API(mTLS) 공용 배관. 로그인(/api/toss/login)·푸시 발송(/api/toss/send)이 공유.
// fetch는 커스텀 TLS agent를 못 받으므로 node:https로 클라이언트 인증서를 붙여 요청한다.
// 필요한 환경변수(비밀 — 커밋 금지):
//   TOSS_MTLS_CERT_B64 / TOSS_MTLS_KEY_B64  클라이언트 인증서·개인키(PEM)를 base64
//   (PFX를 받았다면 TOSS_MTLS_PFX_B64 + TOSS_MTLS_PFX_PASS 로 대체)

export const TOSS_API = 'https://apps-in-toss-api.toss.im'

export function tossAgent(): https.Agent {
  const pfx = process.env.TOSS_MTLS_PFX_B64
  if (pfx) {
    return new https.Agent({
      pfx: Buffer.from(pfx, 'base64'),
      passphrase: process.env.TOSS_MTLS_PFX_PASS,
    })
  }
  const cert = process.env.TOSS_MTLS_CERT_B64
  const key = process.env.TOSS_MTLS_KEY_B64
  if (!cert || !key) throw new Error('TOSS_MTLS_CERT_B64/KEY_B64 (또는 PFX) 환경변수가 없습니다')
  return new https.Agent({
    cert: Buffer.from(cert, 'base64').toString('utf8'),
    key: Buffer.from(key, 'base64').toString('utf8'),
  })
}

export function tossRequest(
  path: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  body?: string,
): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const req = https.request(TOSS_API + path, { method, agent: tossAgent(), headers }, res => {
      let data = ''
      res.on('data', c => (data += c))
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode ?? 0, json: data ? JSON.parse(data) : null })
        } catch {
          resolve({ status: res.statusCode ?? 0, json: data })
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
  })
}
