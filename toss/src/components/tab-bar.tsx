import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, type IconName } from "@/components/icon";
import { getAlerts } from "@/lib/api/alerts";

// 토스 하단 탭바 — 상단 드로어(햄버거) 대체. 토스 시스템 버튼(···/X)과 겹치던 문제 해결.
const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: "/", icon: "home", label: "홈" },
  { href: "/boxes", icon: "box", label: "상자" },
  { href: "/folders", icon: "folder", label: "서랍" },
  { href: "/alerts", icon: "bell", label: "알림" },
  { href: "/profile", icon: "user", label: "프로필" },
];

// 하위 화면(상세·목록)에서도 소속 탭을 액티브로 — 탭바만 뜨고 아무것도 안 켜지는 상태 방지.
// 박스 상세(/box/*)는 어디서 열든 '상자' 탭 소속으로 고정(진입 출처 추적 안 함).
function tabOf(p: string): string {
  if (p === "/") return "/";
  if (p === "/boxes" || p.startsWith("/box/") || p === "/messy" || p === "/done" || p === "/favorites") return "/boxes";
  if (p === "/folders" || p.startsWith("/folder/")) return "/folders";
  if (p.startsWith("/alerts")) return "/alerts";
  if (p.startsWith("/profile")) return "/profile";
  return ""; // 그 외 → 아무 탭도 안 켜짐
}

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 알림 탭 배지 — 안읽음(unseen) 개수. 알림함과 같은 ['alerts'] 캐시 공유.
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: () => getAlerts() });
  const unseenCount = alerts.filter((a) => a.unseen).length;

  // 탭 전환은 히스토리에 쌓지 않는다: 홈("/")을 바닥에 깔고 그 위에 탭을 얹어
  // 어느 탭에서든 뒤로가기 = 홈으로 가게 한다(탭끼리 뒤로가기가 이어지던 문제 해결).
  // 서브페이지 이동(AppLink)은 일반 push라 뒤로가기=이전 화면 그대로.
  function goTab(href: string) {
    if (pathname === href) return;
    if (href !== "/") navigate("/");
    navigate(href);
  }

  const activeHref = tabOf(pathname);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper pb-[var(--app-safe-bottom,0px)]">
      {TABS.map((t) => {
        const active = activeHref === t.href;
        return (
          <button
            key={t.href}
            onClick={() => goTab(t.href)}
            className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
              active ? "text-ink" : "text-ink-faint"
            }`}
          >
            <span className="relative">
              <Icon name={t.icon} size={22} strokeWidth={active ? 2.1 : 1.75} />
              {t.href === "/alerts" && unseenCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-tomato px-1 text-[9px] font-extrabold leading-none text-white">
                  {unseenCount > 99 ? "99+" : unseenCount}
                </span>
              )}
            </span>
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
