import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAlerts } from "@/lib/api/alerts";
import { AlertsView } from "@/components/alerts-view";
import { InlineAdBanner } from "../components/inline-ad-banner";
import { requestPushAgreementOnAlertsVisit } from "../lib/push-agreement";
import { ScreenLoading, ScreenError } from "./screen-state";

// 알림함 — 푸시(intoss://pickstash/alerts 고정)로 진입하는 목적지. 내 상자들의 최신 활동 목록.
// 항목 탭 → 그 상자로 앱 내부 이동(딥링크 다중세그먼트 제약 회피).
export function AlertsScreen() {
  const { data, isPending, error } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => getAlerts(),
  });

  // 알림 동의는 앱 진입 시 자동으로 뜨면 반려된다 — 대신 사용자가 '알림'을 보러 직접 들어온 이
  // 맥락에서만 요청한다(탭당 세션 1회, push-agreement.ts 참고).
  useEffect(() => {
    requestPushAgreementOnAlertsVisit();
  }, []);

  if (isPending) return <ScreenLoading />;
  if (error) return <ScreenError />;
  // 광고는 헤더 바로 아래 인라인 배너(홈·둘러보기와 동일 패턴, 한 화면에 광고 1개만).
  return <AlertsView items={data ?? []} midBanner={<InlineAdBanner />} />;
}
