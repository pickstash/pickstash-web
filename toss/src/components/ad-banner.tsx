import { useEffect, useRef, useState } from "react";
import { TossAds } from "@apps-in-toss/web-framework";
import { AD_GROUP_ID, ensureAdsInitialized } from "../lib/toss-ads";

// 하단 고정 배너 광고(토스 전용 — 웹 빌드에는 포함되지 않음). 홈은 인라인 배너(inline-ad-banner.tsx)를
// 대신 쓰고 이 컴포넌트를 렌더하지 않는다(화면에 광고 1개만). 돋보기도 인라인 배너(검색바 아래).
// 광고그룹 ID 미설정이거나 토스 앱 환경이 아니면(WebView 브라우저 미리보기 등) 아무것도 렌더하지 않는다.
export function AdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!AD_GROUP_ID) return;
    let cancelled = false;
    ensureAdsInitialized()
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

  // 탭바 바로 위(‘새 상자’ CTA 아래)에 고정. --app-tabbar-h는 TabBar가 자기 실제 렌더 높이를
  // ResizeObserver로 실측해 세팅한다(tab-bar.tsx) — 여기서 임의 기본값을 믿고 쓰면 탭바 치수가
  // 바뀔 때마다 광고배너가 플로팅 탭바에 가려지는 문제가 재발한다(과거 실패 원인).
  // 높이는 --app-banner-h(App.tsx가 배너 있는 화면에서만 세팅, 기본 6rem).
  // 광고가 안 떠도(브라우저·ID 미설정·no-fill) 검정 영역 플레이스홀더로 자리를 항상 확보한다.
  return (
    <div className="fixed inset-x-0 bottom-[var(--app-tabbar-h,3.625rem)] z-30 h-[var(--app-banner-h,72px)] overflow-hidden border-t border-line bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
