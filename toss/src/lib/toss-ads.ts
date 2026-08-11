import { TossAds } from "@apps-in-toss/web-framework";

// 광고 배너(고정 하단·인라인) 공용 — 광고그룹 ID는 배너 위치와 무관하게 하나.
export const AD_GROUP_ID = import.meta.env.VITE_TOSS_AD_BANNER_GROUP_ID as string | undefined;

// TossAds.initialize는 앱 전체에서 한 번만 불러야 한다(문서 권장). 고정 배너·인라인 배너가
// 화면마다 각자 마운트돼도 실제 초기화는 최초 1회만 나가도록 모듈 스코프에 캐싱해 공유한다.
let initPromise: Promise<void> | null = null;
export function ensureAdsInitialized(): Promise<void> {
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
