import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getFolderViewByInviteCode } from "@/lib/api/folder-invites";
import { FolderViewer } from "@/app/folder-invite/[code]/folder-viewer";
import { useSession } from "../lib/use-session";
import { ScreenLoading, ScreenError } from "./screen-state";

// 서랍 초대 링크(intoss://pickstash/folder-invite/<code>) 진입 → 공개 RPC로 서랍+상자 목록을 뷰어로,
// 하단 '참여하기'로 서랍 안 상자 전체 참여 + 서랍을 내 창고에 담기. 비로그인이면 참여 시 인라인 로그인.
export function FolderInviteScreen() {
  const { code } = useParams<{ code: string }>();
  const { session } = useSession();
  const { data, isPending, error } = useQuery({
    queryKey: ["folder-invite-view", code],
    queryFn: () => getFolderViewByInviteCode(code!),
  });

  if (isPending) return <ScreenLoading />;
  if (error) return <ScreenError />;
  if (!data) return <ScreenError message="찾을 수 없는 서랍이에요" />;

  return <FolderViewer view={data} isLoggedIn={!!session} code={code!} />;
}
