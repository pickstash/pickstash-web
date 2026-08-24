import { createDecipheriv } from 'node:crypto'

// 토스 login-me / 웹 토스로그인 /me의 name 등 '동의 정보'는 AES-256-GCM으로 암호화돼 온다.
// 복호화 키·AAD는 발급 채널별로 다르다(둘 다 비밀 — 커밋 금지):
//   앱인토스(미니앱): TOSS_USERINFO_KEY_B64 / TOSS_USERINFO_AAD (콘솔 발급) — 기본값
//   자체 웹 토스로그인: TOSS_LOGIN_USERINFO_KEY_B64 / TOSS_LOGIN_USERINFO_AAD (인증부서 이메일 발급) — 호출부가 인자로 전달
// 암호문 형식: base64( IV(12바이트) + ciphertext + authTag(16바이트) ).
// 키가 없거나 복호화 실패 시 null 반환 → 호출부가 안전한 기본값으로 폴백(암호문을 절대 저장하지 않음).
export function decryptTossUserInfo(
  encBase64: string | undefined | null,
  keyB64: string | undefined = process.env.TOSS_USERINFO_KEY_B64,
  aad: string | undefined = process.env.TOSS_USERINFO_AAD,
): string | null {
  if (!encBase64 || !keyB64) return null
  try {
    const key = Buffer.from(keyB64, 'base64')
    const data = Buffer.from(encBase64, 'base64')
    if (data.length < 12 + 16) return null
    const iv = data.subarray(0, 12)
    const authTag = data.subarray(data.length - 16)
    const ciphertext = data.subarray(12, data.length - 16)
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    if (aad) decipher.setAAD(Buffer.from(aad, 'utf8'))
    decipher.setAuthTag(authTag)
    const out = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return out.toString('utf8').trim() || null
  } catch {
    return null
  }
}
