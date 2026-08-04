import { useLocation, useNavigate } from "react-router-dom";
import { Icon, type IconName } from "@/components/icon";

// 토스 하단 탭바 — 상단 드로어(햄버거) 대체. 토스 시스템 버튼(···/X)과 겹치던 문제 해결.
const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: "/", icon: "home", label: "홈" },
  { href: "/boxes", icon: "box", label: "상자" },
  { href: "/folders", icon: "folder", label: "서랍" },
  { href: "/profile", icon: "user", label: "프로필" },
];

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 탭 전환은 히스토리에 쌓지 않는다: 홈("/")을 바닥에 깔고 그 위에 탭을 얹어
  // 어느 탭에서든 뒤로가기 = 홈으로 가게 한다(탭끼리 뒤로가기가 이어지던 문제 해결).
  // 서브페이지 이동(AppLink)은 일반 push라 뒤로가기=이전 화면 그대로.
  function goTab(href: string) {
    if (pathname === href) return;
    if (href !== "/") navigate("/");
    navigate(href);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-paper">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <button
            key={t.href}
            onClick={() => goTab(t.href)}
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
