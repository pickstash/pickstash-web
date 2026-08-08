import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { getSchemeUri, getTossShareLink, share, getClipboardText, getPlatformOS, requestReview } from "@apps-in-toss/web-framework";
import { configureNativeShare } from "@/lib/share/native-share";
import { configureClipboardReader, configureClipboardPeeker } from "@/lib/clipboard/native-clipboard";
import { configureReviewRequester } from "@/lib/review/native-review";

import App from "./App.tsx";
import { TossNavProvider } from "./lib/nav-provider";
import { ErrorBoundary } from "./components/error-boundary";
import { BackHandler } from "./components/back-handler";
import { configureUnfurl } from "@/lib/api/unfurl";
import { createClient } from "@/lib/supabase/client";
import "./index.css";

// 링크 미리보기(OG 언퍼)는 웹 백엔드(/api/unfurl)에 있다. 토스는 다른 오리진이라
// 절대 URL + Supabase 세션 토큰(Bearer)으로 호출한다. base는 로그인 엔드포인트와 동일 도메인.
configureUnfurl({
  base: new URL(import.meta.env.VITE_TOSS_LOGIN_ENDPOINT).origin,
  getToken: async () =>
    (await createClient().auth.getSession()).data.session?.access_token ?? null,
});

// 공유는 토스 네이티브(intoss:// 딥링크)로 — 외부 링크 유도 금지 정책 준수. 받는 토스 유저는 앱에서 열림.
// path는 앱 내 경로(getSchemeUri가 intoss://pickstash를 떼고 이 경로로 진입).
configureNativeShare(async ({ path, ogImage }) => {
  const link = await getTossShareLink(`intoss://pickstash${path}`, ogImage);
  await share({ message: link });
});

// 클립보드 읽기 — 토스 웹뷰는 navigator.clipboard가 막혀 있어 네이티브 getClipboardText 사용.
// getClipboardText를 바로 부르면 권한 다이얼로그가 매번(때론 이중으로) 떠서 루프가 생긴다.
// 권한 상태를 먼저 확인 → notDetermined일 때만 다이얼로그 1회 → allowed면 읽기, 로 흐름을 명시한다.
configureClipboardReader(async () => {
  // 권한 상태 먼저 확인 → allowed 아니면 다이얼로그 1회만 → allowed일 때 읽기.
  // (granite.config의 clipboard read 권한 선언과 함께여야 권한이 굳어 반복 안 뜬다.)
  const status = await getClipboardText.getPermission();
  if (status !== "allowed") {
    const result = await getClipboardText.openPermissionDialog();
    if (result !== "allowed") throw new Error("clipboard denied");
  }
  return getClipboardText();
});

// 조용한 peek — 권한이 이미 allowed일 때만 읽고 다이얼로그는 안 띄운다(선택지 폼 열 때 클립보드 링크 자동 제안용).
configureClipboardPeeker(async () => {
  try {
    const status = await getClipboardText.getPermission();
    if (status !== "allowed") return null;
    return await getClipboardText();
  } catch {
    return null;
  }
});

// 이용후기(리뷰) — 프로필의 '이용후기 남기기'가 호출. 토스 네이티브 리뷰 UI(피로도 정책상 항상 뜨진 않음).
// 미지원 버전(5.253.0 미만)은 reject → 조용히 무시.
configureReviewRequester(() => {
  // 진단 로그: 미지원(구버전)인지 / 호출은 됐는지 구분. 단, 피로도 정책으로 화면이 안 떠도
  // requestReview는 에러 없이 resolve될 수 있어(정책 차단은 여기서 감지 불가).
  try {
    const supported = (requestReview as unknown as { isSupported?: () => boolean }).isSupported?.();
    console.log("[review] requestReview 호출, isSupported =", supported);
    if (supported === false) {
      console.warn("[review] 이 토스앱 버전은 리뷰를 지원하지 않아요(5.253.0+ 필요).");
    }
    requestReview()
      .then(() => console.log("[review] resolved (화면 노출 여부는 피로도 정책 소관)"))
      .catch((e) => console.warn("[review] rejected", e?.code ?? e));
  } catch (e) {
    console.warn("[review] threw", e);
  }
});

// iOS(WKWebView)는 viewport의 user-scalable=no를 무시해 핀치 확대가 살아있다(토스 규정 위반).
// WebKit 전용 제스처 이벤트(gesture*)를 직접 막아 핀치 줌을 차단한다. 안드로이드엔 이 이벤트가 없어 무해.
for (const type of ["gesturestart", "gesturechange", "gestureend"]) {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

// 하단 홈 인디케이터(iOS 긴 막대) 대응 — iOS에서만 --app-safe-bottom을 실제 safe-area 인셋으로 올린다.
// 안드로이드는 토스 웹뷰가 inset-bottom을 과다 보고하므로 index.css 기본값 0을 유지(흰 여백 방지).
try {
  if (getPlatformOS() === "ios") {
    document.documentElement.style.setProperty("--app-safe-bottom", "env(safe-area-inset-bottom)");
  }
} catch {
  /* SDK 미지원/브라우저 → 기본 0 유지 */
}

// 웹과 동일하게 TanStack Query를 데이터 계층으로 사용 (공유 훅·api 재사용).
// staleTime은 웹 Providers와 맞춘다.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
});

// 딥링크 진입 처리: 푸시 등에서 intoss://pickstash/box/123 로 열리면 그 경로에서 시작한다.
// getSchemeUri()는 콜드스타트 진입 스킴 URL(전체 문자열). 스킴+호스트(intoss://pickstash)를 떼면 앱 내 경로.
// 뒤로가기가 홈으로 가도록 홈("/")을 스택 바닥에 깐다. 브라우저·미지원 환경에선 홈에서 시작.
function initialRouterState(): { entries: string[]; index: number } {
  try {
    const path = getSchemeUri()?.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "") || "/";
    if (path !== "/") return { entries: ["/", path], index: 1 };
  } catch {
    /* SDK 미지원/브라우저 → 홈 */
  }
  return { entries: ["/"], index: 0 };
}

const { entries: routerEntries, index: routerIndex } = initialRouterState();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* 토스 웹뷰는 history API 비의존이라 MemoryRouter 사용. 딥링크로 열리면 해당 경로에서 시작(홈을 바닥에 깔아 뒤로가기=홈). */}
      <MemoryRouter initialEntries={routerEntries} initialIndex={routerIndex}>
        {/* 공유 화면이 useNav()로 이동 — react-router에 바인딩 */}
        <TossNavProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
          {/* 뒤로가기 통제 + 홈 종료 확인 모달 — App의 early return(온보딩·로딩)과 무관하게 항상 마운트 */}
          <BackHandler />
        </TossNavProvider>
      </MemoryRouter>
    </QueryClientProvider>
  </StrictMode>,
);
