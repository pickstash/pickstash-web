// 토스앱(Vite/CSR) 전용 NavProvider 구현. 공유 AppNav를 react-router에 바인딩한다.
// 웹의 NextNavProvider와 짝 — 화면 컴포넌트는 useNav()만 쓰면 양쪽에서 동일하게 동작한다.
import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { NavProvider, type AppNav } from "@/lib/nav/nav";

export function TossNavProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const nav: AppNav = useMemo(
    () => ({
      platform: "toss",
      push: (href) => navigate(href),
      replace: (href) => navigate(href, { replace: true }),
      back: () => navigate(-1),
      // 웹의 router.refresh(RSC 재요청) 대응 → CSR에선 쿼리 전체 무효화로 최신화
      refresh: () => {
        void queryClient.invalidateQueries();
      },
    }),
    [navigate, queryClient],
  );
  return <NavProvider nav={nav}>{children}</NavProvider>;
}
