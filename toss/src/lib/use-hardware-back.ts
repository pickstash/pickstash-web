import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { graniteEvent } from "@apps-in-toss/web-framework";

// 안드로이드 물리 뒤로가기 / iOS 스와이프 뒤로가기 처리.
// 미구독 상태에선 뒤로가기가 네이티브로 가 미니앱이 바로 종료된다(=결정창고가 꺼지고 토스로 나감).
// 홈('/')이 아닐 때만 backEvent를 구독해 앱 내부에서 navigate(-1)로 이전 화면으로 돌아가고,
// 홈에선 구독하지 않아 기본 동작(토스로 나가기)을 그대로 둔다. (구독 시 기본 뒤로가기는 차단됨)
export function useHardwareBack() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (pathname === "/") return; // 홈: 기본 뒤로가기(토스로 나가기) 허용
    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = graniteEvent.addEventListener("backEvent", {
        onEvent: () => navigate(-1),
        onError: (e: unknown) => console.error("[backEvent]", e),
      });
    } catch {
      /* 브라우저·미지원 환경 → no-op(그 환경엔 물리 뒤로가기가 없음) */
    }
    return () => {
      try { unsubscribe?.(); } catch { /* noop */ }
    };
  }, [pathname, navigate]);
}
