import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'

/**
 * 새로 만들기 FAB — 우하단 플로팅(잉크 pill). 홈·상자·서랍의 생성 버튼 톤을 하나로 통일.
 * href(페이지 이동, 예: /box/new) 또는 onClick(시트 열기, 예: 새 서랍) 중 하나를 준다.
 * 토스는 --app-nav-h(탭바+배너)만큼, 웹은 safe-area만큼 띄우고 xl은 430px 컨테이너 안쪽.
 */
export function CreateFab({ href, onClick, label }: { href?: string; onClick?: () => void; label: string }) {
  const className =
    'fixed right-5 z-30 flex items-center gap-1 rounded-full bg-ink py-3.5 pl-[15px] pr-[18px] text-sm font-extrabold text-cream shadow-[0_10px_24px_-6px_rgba(42,42,39,0.55)] active:opacity-85 bottom-[calc(var(--app-nav-h,0px)+var(--app-cta-safe,env(safe-area-inset-bottom))+1rem)] xl:right-[calc(50%-195px)] xl:bottom-12'
  const inner = (
    <>
      <Icon name="plus" size={16} strokeWidth={2} />
      {label}
    </>
  )
  return href ? (
    <AppLink href={href} aria-label={label} className={className}>
      {inner}
    </AppLink>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={className}>
      {inner}
    </button>
  )
}
