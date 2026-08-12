import { ExploreView } from "@/components/explore-view";
import { InlineAdBanner } from "../components/inline-ad-banner";

// 돋보기(탐색) 탭 — 공개 상자·사람 검색 + 공개 피드. 공유 ExploreView 렌더.
// 광고는 검색바와 피드 사이 인라인 배너(홈과 동일 패턴, 한 화면에 광고 1개만).
export function ExploreScreen() {
  return <ExploreView midBanner={<InlineAdBanner />} />;
}
