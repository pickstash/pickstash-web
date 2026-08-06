import { useEffect, useRef, useState } from "react";
import { TossAds } from "@apps-in-toss/web-framework";

const AD_GROUP_ID = import.meta.env.VITE_TOSS_AD_BANNER_GROUP_ID as string | undefined;

// TossAds.initialize는 앱 전체에서 한 번만 불러야 한다(문서 권장). 화면을 오가며
// AdBanner가 여러 번 마운트돼도 실제 초기화는 최초 1회만 나가도록 모듈 스코프에 캐싱.
let initPromise: Promise<void> | null = null;
function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = new Promise((resolve, reject) => {
      if (!TossAds.initialize.isSupported()) {
        reject(new Error("TossAds not supported in this environment"));
        return;
      }
      TossAds.initialize({
        callbacks: {
          onInitialized: () => resolve(),
          onInitializationFailed: (error) => reject(error),
        },
      });
    });
  }
  return initPromise;
}

// 홈 화면 하단 배너 광고(토스 전용 — 웹 빌드에는 포함되지 않음).
// 광고그룹 ID 미설정이거나 토스 앱 환경이 아니면(WebView 브라우저 미리보기 등) 아무것도 렌더하지 않는다.
export function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!AD_GROUP_ID) return;
    let cancelled = false;
    ensureInitialized()
      .then(() => {
        if (!cancelled) setInitialized(true);
      })
      .catch(() => {
        // 지원 안 되는 환경(구버전 토스 앱, 브라우저 미리보기 등) — 조용히 생략
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!initialized || !AD_GROUP_ID || !containerRef.current) return;
    const attached = TossAds.attachBanner(AD_GROUP_ID, containerRef.current, { theme: "auto" });
    return () => attached.destroy();
  }, [initialized]);

  // 탭바 바로 위(‘새 상자’ CTA 아래)에 고정. 높이는 --app-banner-h(App.tsx가 홈에서만 세팅, 기본 6rem).
  // 광고가 안 떠도(브라우저·ID 미설정·no-fill) 검정 영역 플레이스홀더로 자리를 항상 확보한다.
  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--app-tabbar-h,3.5rem)+var(--app-safe-bottom,0px))] z-30 h-[var(--app-banner-h,96px)] overflow-hidden border-t border-line bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
