import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { getSchemeUri } from "@apps-in-toss/web-framework";

import App from "./App.tsx";
import { TossNavProvider } from "./lib/nav-provider";
import { ErrorBoundary } from "./components/error-boundary";
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
        </TossNavProvider>
      </MemoryRouter>
    </QueryClientProvider>
  </StrictMode>,
);
