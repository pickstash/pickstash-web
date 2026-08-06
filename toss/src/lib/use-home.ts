import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // vite alias → 토스 shim
import { loadHomeView } from "@/lib/api/home";

// 홈 데이터 훅 — App(첫로그인 온보딩 분기 판단)과 HomeScreen이 같은 ['home'] 쿼리를 공유(중복 fetch 없음).
// enabled=false면 fetch 안 함(홈 아닌 라우트에서 App이 호출할 때).
export function useHome(enabled = true) {
  return useQuery({
    queryKey: ["home"],
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadHomeView(supabase, user.id);
    },
  });
}
