import { useParams } from "react-router-dom";
import { FollowListView } from "@/components/follow-list-view";
import { useSession } from "../lib/use-session";

// 팔로워/팔로잉 목록 (/follows/:userId/:tab) — 프로필 카운트 탭에서 진입.
export function FollowsScreen() {
  const { userId, tab } = useParams<{ userId: string; tab: string }>();
  const { session } = useSession();
  const initialTab = tab === "following" ? "following" : "followers";
  return <FollowListView userId={userId!} initialTab={initialTab} currentUserId={session?.user?.id} />;
}
