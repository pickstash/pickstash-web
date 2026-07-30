import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import config from "../granite.config.ts";
import App from "./App.tsx";
import { TossNavProvider } from "./lib/nav-provider";
import "./index.css";

// 웹과 동일하게 TanStack Query를 데이터 계층으로 사용 (공유 훅 재사용).
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TDSMobileAITProvider brandPrimaryColor={config.brand.primaryColor}>
        <BrowserRouter>
          {/* 공유 화면이 useNav()로 이동 — react-router에 바인딩 */}
          <TossNavProvider>
            <App />
          </TossNavProvider>
        </BrowserRouter>
      </TDSMobileAITProvider>
    </QueryClientProvider>
  </StrictMode>,
);
