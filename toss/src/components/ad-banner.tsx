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

  if (!AD_GROUP_ID) return null;

  return <div ref={containerRef} className="h-24 w-full" />;
}
