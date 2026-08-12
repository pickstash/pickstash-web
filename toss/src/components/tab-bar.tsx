import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, type IconName } from "@/components/icon";
import { getAlerts } from "@/lib/api/alerts";

// 토스 하단 탭바 — 상단 드로어(햄버거) 대체. 토스 시스템 버튼(···/X)과 겹치던 문제 해결.
// 개편(인스타식) 5탭 — 홈(대시보드) / 상자(전체 관리) / 돋보기(탐색) / 알림 / 프로필. 서랍은 홈에 흡수.
const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: "/", icon: "home", label: "홈" },
  { href: "/boxes", icon: "box", label: "상자" },
  { href: "/explore", icon: "search", label: "둘러보기" },
  { href: "/alerts", icon: "bell", label: "알림" },
  { href: "/profile", icon: "user", label: "프로필" },
];

// 하위 화면 소속 탭 매핑. 상자 상세·서랍은 '상자' 탭 소속.
function tabOf(p: string): string {
  if (p === "/") return "/";
  if (p === "/boxes" || p.startsWith("/box/") || p === "/messy" || p === "/done" ||
      p === "/bookmarks" || p === "/favorites" || p === "/folders" || p.startsWith("/folder/")) return "/boxes";
  if (p.startsWith("/explore") || p.startsWith("/p/") || p.startsWith("/u/")) return "/explore";
  if (p.startsWith("/alerts")) return "/alerts";
  if (p.startsWith("/profile")) return "/profile";
  return "";
}

export function TabBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const rootRef = useRef<HTMLDivElement>(null);

  // 알림 탭 배지 — 안읽음(unseen) 개수. 알림함과 같은 ['alerts'] 캐시 공유.
  const { data: alerts = [] } = useQuery({ queryKey: ["alerts"], queryFn: () => getAlerts() });
  const unseenCount = alerts.filter((a) => a.unseen).length;

  // 탭바 실제 풋프린트(필 카드 높이 + 화면과의 여백)를 --app-tabbar-h로 :root에 실시간 반영한다.
  // 이 높이는 아이콘·라벨·패딩으로 정해지는 내용 기반 높이라 rem 상수로 흉내내면 틀어지기 쉽다
  // (AdBanner가 그 상수를 믿고 탭바 바로 위에 앉다가 실제 높이보다 낮게 잡혀 가려지는 사고가 났었다).
  // ResizeObserver로 실측해 반영하면 폰트·아이콘 크기가 바뀌어도 항상 맞는다.
  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const root = document.documentElement;
    const sync = () => root.style.setProperty("--app-tabbar-h", `${el.offsetHeight}px`);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--app-tabbar-h");
    };
  }, []);

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
    // 토스 미니앱 브랜딩 가이드: 탭바는 화면에 붙는 전체폭 바가 아니라 여백을 둔 플로팅 형태여야 한다.
    // 실제 토스 탭바(Mobile_Tabbar) 레퍼런스: 완전한 필(알약) 모양, 테두리 없이 그림자로만 뜬 흰 카드.
    // 바깥 div가 좌우·하단 여백(+safe-area)을 잡고, 안쪽 nav가 rounded-full·그림자로 뜬 카드로 보이게 한다.
    <div
      ref={rootRef}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2.5 pb-[calc(var(--app-safe-bottom,0px)+0.375rem)]"
    >
      <nav className="flex w-full max-w-[400px] items-center justify-around rounded-full bg-paper py-1.5 shadow-[0_6px_18px_-4px_rgba(42,42,39,0.18)]">
        {TABS.map((t) => {
          const active = activeHref === t.href;
          return (
            <button
              key={t.href}
              onClick={() => goTab(t.href)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] font-semibold ${
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
    </div>
  );
}
