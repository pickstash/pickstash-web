import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { graniteEvent } from "@apps-in-toss/web-framework";

// 뒤로가기(안드로이드 물리 / iOS 시스템·스와이프) 인텐트 통제 — backEvent를 항상 구독한다.
//   하위 화면=navigate(-1), 홈('/')=종료 확인(onHomeBack). 미구독 시 뒤로가기가 네이티브로 가
//   미니앱이 확인 없이 바로 종료된다.
// iOS 엣지 스와이프 제스처 자체의 on/off는 화면별로 달라(홈·로그인만 OFF) App에서 제어한다.
export function useHardwareBack(onHomeBack: () => void) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
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
