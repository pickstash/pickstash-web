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

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper pb-[var(--app-safe-bottom,0px)]">
      {TABS.map((t) => {
        const active = pathname === t.href;
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
