import { useParams } from "react-router-dom";
import { ProfileFeedView } from "@/components/profile-feed-view";

// 남의 공개 프로필 (/u/:handle) — 인스타식 헤더 + 공개 상자 그리드.
export function ProfileViewScreen() {
  const { handle } = useParams<{ handle: string }>();
  return <ProfileFeedView handle={handle!} />;
}
