import { ExploreView } from "@/components/explore-view";
import { AdBanner } from "../components/ad-banner";

// 돋보기(탐색) 탭 — 공개 상자·사람 검색 + 공개 피드. 공유 ExploreView 렌더.
export function ExploreScreen() {
  return (
    <>
      <ExploreView />
      <AdBanner />
    </>
  );
}
