// 토스 화면 공용 로딩·에러 상태 (웹은 서버 렌더라 불필요, 토스는 CSR fetch라 필요).
export function ScreenLoading() {
  return <div className="flex min-h-dvh items-center justify-center text-ink-faint">불러오는 중…</div>;
}

export function ScreenError({ message = "화면을 불러오지 못했어요" }: { message?: string }) {
  return <div className="flex min-h-dvh items-center justify-center px-6 text-center text-tomato">{message}</div>;
}
