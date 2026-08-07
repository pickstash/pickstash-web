import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { graniteEvent, setIosSwipeGestureEnabled } from "@apps-in-toss/web-framework";

// 물리(안드로이드) / 시스템·제스처(iOS) 뒤로가기 통제.
// - iOS 엣지 스와이프는 네이티브 제스처라 backEvent로 안 잡힌다 → setIosSwipeGestureEnabled(false)로 끈다.
//   뒤로가기는 화면 내 PageHeader back·토스 시스템 백으로만 → 전부 backEvent를 거쳐 통제된다.
// - backEvent를 항상 구독: 하위 화면=navigate(-1), 홈('/')=종료 확인(onHomeBack).
//   미구독 시 뒤로가기가 네이티브로 가 미니앱이 확인 없이 바로 종료된다.
export function useHardwareBack(onHomeBack: () => void) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // iOS 스와이프 뒤로가기 OFF — 네비게이션마다 재확인해 확실히 꺼둔다(화면 전환 시 초기화 대비).
    try {
      void setIosSwipeGestureEnabled({ isEnabled: false });
    } catch {
      /* 브라우저·미지원 환경 → noop */
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = graniteEvent.addEventListener("backEvent", {
        onEvent: () => {
          if (pathname === "/") onHomeBack(); // 홈: 종료 확인 모달
          else navigate(-1); // 하위: 이전 화면
        },
        onError: (e: unknown) => console.error("[backEvent]", e),
      });
    } catch {
      /* 브라우저·미지원 환경 → no-op(그 환경엔 물리 뒤로가기가 없음) */
    }
    return () => {
      try { unsubscribe?.(); } catch { /* noop */ }
    };
  }, [pathname, navigate, onHomeBack]);
}
