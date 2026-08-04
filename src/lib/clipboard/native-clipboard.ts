// 클립보드 텍스트 읽기 — 웹·토스 공유.
// 웹: navigator.clipboard.readText(). 토스 웹뷰: navigator.clipboard가 막혀 있어 토스 네이티브
// getClipboardText()를 써야 한다. 토스 SDK를 공유 코드에 직접 import하면 웹 빌드가 깨지므로,
// 토스가 main.tsx에서 실제 리더를 주입한다(configureUnfurl/NativeShare와 동일 패턴).

type ClipboardReader = () => Promise<string>

let nativeReader: ClipboardReader | null = null

export function configureClipboardReader(fn: ClipboardReader) {
  nativeReader = fn
}

/** 클립보드 텍스트를 읽는다. 토스면 네이티브, 아니면 navigator. 실패 시 throw(호출부가 안내). */
export async function readClipboardText(): Promise<string> {
  if (nativeReader) return nativeReader()
  if (navigator.clipboard?.readText) return navigator.clipboard.readText()
  throw new Error('clipboard unsupported')
}
