import { useLocation, useNavigate } from "react-router-dom";
import { Icon, type IconName } from "@/components/icon";

// 토스 하단 탭바 — 상단 드로어(햄버거) 대체. 토스 시스템 버튼(···/X)과 겹치던 문제 해결.
const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: "/", icon: "home", label: "홈" },
  { href: "/folders", icon: "folder", label: "폴더" },
  { href: "/box/new", icon: "plus", label: "새 상자" },
  { href: "/profile", icon: "user", label: "프로필" },
];

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <button
            key={t.href}
            onClick={() => navigate(t.href)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${
              active ? "text-ink" : "text-ink-faint"
            }`}
          >
            <Icon name={t.icon} size={22} strokeWidth={active ? 2.1 : 1.75} />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
