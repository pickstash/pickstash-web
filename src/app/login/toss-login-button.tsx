// 토스로 로그인 — 서버 시작 라우트(/auth/toss/start)로 전체 네비게이션(OAuth라 SPA 이동 아님).
// next를 보존해 로그인 후 원래 가려던 곳(예: 초대 링크)으로 복귀.
export function TossLoginButton({ next }: { next?: string }) {
  const href = next && next.startsWith('/') ? `/auth/toss/start?next=${encodeURIComponent(next)}` : '/auth/toss/start'
  return (
    <a
      href={href}
      className="flex w-full items-center justify-center gap-2 rounded-field bg-[#0064FF] px-6 py-4 text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-80"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 5h6.5a4.5 4.5 0 0 1 0 9H11v5H7V5z" fill="currentColor" />
      </svg>
      토스로 로그인
    </a>
  )
}
