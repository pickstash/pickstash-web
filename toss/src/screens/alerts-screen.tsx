import { useQuery } from "@tanstack/react-query";
import { getAlerts } from "@/lib/api/alerts";
import { AlertsView } from "@/components/alerts-view";
import { InlineAdBanner } from "../components/inline-ad-banner";
import { AlertsPushBanner } from "../components/alerts-push-banner";
import { ScreenLoading, ScreenError } from "./screen-state";

// 알림함 — 푸시(intoss://pickstash/alerts 고정)로 진입하는 목적지. 내 상자들의 최신 활동 목록.
// 항목 탭 → 그 상자로 앱 내부 이동(딥링크 다중세그먼트 제약 회피).
// ⚠️ 알림 동의 요청은 여기서 자동으로 걸지 않는다 — 탭 진입(자동, 클릭 아님)만으로 걸었다가도
// "미니앱 접속 직후 바텀시트 노출"로 반려됐다. AlertsPushBanner 카드는 눈에는 바로 보이지만
// 그 안의 버튼을 눌러야만 동의창이 뜬다(자동 아님) — 노출성과 정책 준수를 함께 챙긴다.
export function AlertsScreen() {
  const { data, isPending, error } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => getAlerts(),
  });

  if (isPending) return <ScreenLoading />;
  if (error) return <ScreenError />;
  // 광고는 헤더 바로 아래 인라인 배너(홈·둘러보기와 동일 패턴, 한 화면에 광고 1개만).
  return <AlertsView items={data ?? []} pushBanner={<AlertsPushBanner />} midBanner={<InlineAdBanner />} />;
}
