// 클립보드 텍스트 읽기 — 웹·토스 공유.
// 웹: navigator.clipboard.readText(). 토스 웹뷰: navigator.clipboard가 막혀 있어 토스 네이티브
// getClipboardText()를 써야 한다. 토스 SDK를 공유 코드에 직접 import하면 웹 빌드가 깨지므로,
// 토스가 main.tsx에서 실제 리더를 주입한다(configureUnfurl/NativeShare와 동일 패턴).

type ClipboardReader = () => Promise<string>
// 조용한 peek — 권한이 '이미 허용'된 경우에만 읽고, 아니면 null(권한 다이얼로그 안 띄움).
type ClipboardPeeker = () => Promise<string | null>

let nativeReader: ClipboardReader | null = null
let peeker: ClipboardPeeker | null = null

export function configureClipboardReader(fn: ClipboardReader) {
  nativeReader = fn
}

export function configureClipboardPeeker(fn: ClipboardPeeker) {
  peeker = fn
}

/**
 * 폼 열 때 클립보드를 '조용히' 엿본다(토스식 자동 제안용). 권한 팝업을 띄우지 않는다:
 * - 토스: 권한이 이미 allowed면 읽고, 아니면 null.
 * - 웹: 사용자 제스처 없이 읽을 수 없으므로 항상 null(자동 제안 없음, 수동 버튼만).
 */
export async function peekClipboardIfAllowed(): Promise<string | null> {
  if (peeker) {
    try { return await peeker() } catch { return null }
  }
  return null
}

/** 클립보드 텍스트를 읽는다. 토스면 네이티브, 아니면 navigator. 실패 시 throw(호출부가 안내). */
export async function readClipboardText(): Promise<string> {
  if (nativeReader) return nativeReader()
  if (navigator.clipboard?.readText) return navigator.clipboard.readText()
  throw new Error('clipboard unsupported')
}
