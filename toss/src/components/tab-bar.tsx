import { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon, type IconName } from "@/components/icon";
import { getAlerts } from "@/lib/api/alerts";

// 토스 하단 탭바 — 상단 드로어(햄버거) 대체. 토스 시스템 버튼(···/X)과 겹치던 문제 해결.
// 5탭 — 홈 / 서랍(상자·서랍 통합, 스마트 기본값) / 둘러보기 / 알림 / 프로필.
// '상자'가 아니라 '서랍' 라벨: 이 탭은 서랍/상자 토글을 다 품고, 서랍이 있으면 서랍부터 연다(boxes-screen).
const TABS: { href: string; icon: IconName; label: string }[] = [
  { href: "/", icon: "home", label: "홈" },
  { href: "/boxes", icon: "folder", label: "서랍" },
  { href: "/explore", icon: "search", label: "둘러보기" },
  { href: "/alerts", icon: "bell", label: "알림" },
  { href: "/profile", icon: "user", label: "프로필" },
];

// 최상위 탭 경로들 — App.tsx가 iOS 엣지 스와이프 OFF 판별에 쓴다(탭 루트는 앱 내 뒤로 갈 곳이 없어
// 스와이프하면 토스로 앱이 종료돼버린다). 하위 화면은 정확 일치가 아니라 제외된다.
export const TAB_HREFS = TABS.map(t => t.href);

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

  // 앱인토스 브랜딩 가이드 "탭바를 쓰려면 토스와 동일한 플로팅 형태로 구현"해야 한다.
  // ⚠️ 한때 TDS 피그마(TDS_Mobile_for_Apps_in_Toss, "Tab Bar" 컴포넌트)를 edge-to-edge 독(dock)
  // 형태로 그대로 옮긴 적이 있는데, 그 컴포넌트 설명("앱 하단에 고정되어… 홈, 혜택, 설정 등")은
  // 토스 본체 앱 자신의 내비게이션을 가리키는 것이었다(미니앱 전용 스펙이 아님) — "혜택"은 토스
  // 본체의 실제 탭 이름. 미니앱은 본체와 시각적으로 구분돼야 하므로, 화면 가장자리에 붙지 않고
  // 좌우·하단에 여백을 두고 뜬 캡슐(pill) 형태로 구현한다.
  // ⚠️ 하단 여백은 raw env(safe-area-inset-bottom)이 아니라 --app-safe-bottom(main.tsx)을 써야
  // 한다 — 안드로이드 토스 웹뷰는 env(safe-area-inset-bottom)을 과다 보고해(웹 브라우저에선 0이라
  // 문제가 안 보임) 갤럭시 실기기에서 하단 여백이 과하게 커지는 버그가 났었다. --app-safe-bottom은
  // iOS에서만 실제 인셋을 채우고 안드로이드는 0으로 고정하는 안전장치가 이미 돼 있다.
  return (
    <div
      ref={rootRef}
      className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(var(--app-safe-bottom,0px)+12px)]"
    >
      <nav className="w-full max-w-[402px] rounded-full bg-paper shadow-[0_8px_24px_rgba(42,42,39,0.18)]">
        <div className="flex h-[60px] items-center justify-around px-3">
          {TABS.map((t) => {
            const active = activeHref === t.href;
            return (
              <button
                key={t.href}
                onClick={() => goTab(t.href)}
                className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold ${
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
        </div>
      </nav>
    </div>
  );
}
