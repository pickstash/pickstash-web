import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import config from "../granite.config.ts";
import App from "./App.tsx";
import "./index.css";

// 웹과 동일하게 TanStack Query를 데이터 계층으로 사용 (공유 훅 재사용 대비).
const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <TDSMobileAITProvider brandPrimaryColor={config.brand.primaryColor}>
        <App />
      </TDSMobileAITProvider>
    </QueryClientProvider>
  </StrictMode>,
);
