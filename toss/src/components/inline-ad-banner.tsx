import { useEffect, useRef, useState } from "react";
import { TossAds } from "@apps-in-toss/web-framework";
import { AD_GROUP_ID, ensureAdsInitialized } from "../lib/toss-ads";

// 홈 히어로 카드 아래 인라인 배너 광고(토스 전용). 하단 고정 배너(ad-banner.tsx)와 달리 스크롤에
// 섞이는 카드 형태 — 홈에서는 이걸 쓰고 고정 배너는 렌더하지 않는다(한 화면에 광고 1개만).
export function InlineAdBanner() {
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

  // 광고그룹 ID 미설정 환경(웹 미리보기 등)에선 자리 자체를 안 차지하게 렌더 생략 —
  // 고정 배너와 달리 인라인은 플레이스홀더가 스크롤 흐름 중간에 빈 검정 박스로 걸리면 어색하다.
  if (!AD_GROUP_ID) return null;

  return (
    <div className="overflow-hidden rounded-card border-t border-line bg-black">
      <div ref={containerRef} className="h-[72px] w-full" />
    </div>
  );
}
