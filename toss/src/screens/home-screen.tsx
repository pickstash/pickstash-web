import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // vite alias → 토스 shim
import { loadHomeView } from "@/lib/api/home";
import { HomeView } from "@/components/home-view";
import { AdBanner } from "../components/ad-banner";
import { ScreenLoading } from "./screen-state";

// 토스 홈 = 공유 로더로 데이터 fetch → 공유 HomeView 렌더. 웹과 동일 화면·로직.
export function HomeScreen() {
  const { data, isPending, error } = useQuery({
    queryKey: ["home"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadHomeView(supabase, user.id);
    },
  });

  if (isPending) {
    return <ScreenLoading />;
  }
  if (error || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-tomato">
        홈을 불러오지 못했어요
      </div>
    );
  }
  // banner(웹 푸시 배너)는 토스에서 생략 — 토스 알림은 추후 별도 연동
  return <HomeView {...data} bottomBanner={<AdBanner />} />;
}
