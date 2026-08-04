// 초대/공유 링크 전송 — 웹·토스 공유.
// 웹: 웹 도메인 링크를 클립보드에 복사(받는 사람이 브라우저에서 로그인 없이 열람→참여).
// 토스: intoss:// 딥링크를 네이티브 공유 시트로(외부 링크 유도 금지 정책 준수, 받는 토스 유저는 앱에서 열림).
// 토스 SDK를 공유 코드에 직접 import하면 웹 빌드가 깨지므로, 토스가 main.tsx에서 실제 공유 함수를 주입한다.

type NativeShareFn = (opts: { path: string; ogImage?: string }) => Promise<void>

let nativeShare: NativeShareFn | null = null

/** 토스 앱 시작 시 1회 호출 — getTossShareLink+share를 주입. */
export function configureNativeShare(fn: NativeShareFn) {
  nativeShare = fn
}

/** 네이티브 공유가 준비됐는지(=토스). UI 문구 분기용(공유 vs 복사). */
export function hasNativeShare(): boolean {
  return nativeShare != null
}

function copyToClipboard(text: string) {
  try {
    return navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
    } catch {
      /* 폴백 실패 시 조용히 무시 */
    }
    document.body.removeChild(ta)
    return Promise.resolve()
  }
}

/**
 * 초대 링크를 공유한다. path는 앱 내 경로(예: '/invite/<code>', '/folder-invite/<code>').
 * 반환: 'shared'(토스 네이티브 시트) | 'copied'(웹 클립보드) — 호출부가 토스트 문구를 분기.
 */
export async function shareInviteLink(opts: { path: string; ogImage?: string }): Promise<'shared' | 'copied'> {
  if (nativeShare) {
    try {
      await nativeShare(opts)
      return 'shared'
    } catch {
      // 토스 네이티브 브릿지가 없는 환경(브라우저 미리보기 등) → 클립보드 복사로 폴백
    }
  }
  await copyToClipboard(`${window.location.origin}${opts.path}`)
  return 'copied'
}
