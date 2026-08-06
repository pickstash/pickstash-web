// 앱 리뷰(이용후기) 요청 — 토스 네이티브 리뷰 UI. 공유 컴포넌트(profile-client)가
// 토스 SDK를 직접 import하면 웹 빌드가 깨지므로, 토스 main.tsx에서 실제 구현을 주입한다.
// 웹은 미설정 → no-op.
let requester: (() => void) | null = null

export function configureReviewRequester(fn: () => void): void {
  requester = fn
}

/** 리뷰 작성 요청. 토스에서만 동작(주입됨). 피로도 정책상 항상 UI가 뜨진 않는다. */
export function requestAppReview(): void {
  requester?.()
}
