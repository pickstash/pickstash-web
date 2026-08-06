import { useQuery } from "@tanstack/react-query";
import { getAlerts } from "@/lib/api/alerts";
import { AlertsView } from "@/components/alerts-view";
import { AdBanner } from "../components/ad-banner";
import { ScreenLoading, ScreenError } from "./screen-state";

// 알림함 — 푸시(intoss://pickstash/alerts 고정)로 진입하는 목적지. 내 상자들의 최신 활동 목록.
// 항목 탭 → 그 상자로 앱 내부 이동(딥링크 다중세그먼트 제약 회피).
export function AlertsScreen() {
  const { data, isPending, error } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => getAlerts(),
  });

  if (isPending) return <ScreenLoading />;
  if (error) return <ScreenError />;
  return (
    <>
      <AlertsView items={data ?? []} />
      <AdBanner />
    </>
  );
}
