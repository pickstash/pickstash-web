import { MyProfileView } from "@/components/my-profile-view";
import { AdBanner } from "../components/ad-banner";

// 프로필 탭 — 인스타식 내 프로필(공개 그리드 + 저장함). 설정은 톱니 → /profile/settings.
export function MyProfileScreen() {
  return (
    <>
      <MyProfileView />
      <AdBanner />
    </>
  );
}
