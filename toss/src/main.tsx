import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import App from "./App.tsx";
import { TossNavProvider } from "./lib/nav-provider";
import { ErrorBoundary } from "./components/error-boundary";
import "./index.css";

// 웹과 동일하게 TanStack Query를 데이터 계층으로 사용 (공유 훅·api 재사용).
// staleTime은 웹 Providers와 맞춘다.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60 * 1000 } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* 토스 웹뷰는 앱을 루트가 아닌 경로/스킴에서 로드할 수 있어 MemoryRouter 사용
          (항상 "/"에서 시작, history API 비의존). 딥링크는 추후 initialEntries로 처리. */}
      <MemoryRouter>
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
