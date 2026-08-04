import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { getBoxViewByInviteCode } from "@/lib/api/invites";
import { BoxViewer } from "@/app/invite/[code]/box-viewer";
import { useSession } from "../lib/use-session";
import { ScreenLoading, ScreenError } from "./screen-state";

// 초대 링크(intoss://pickstash/invite/<code>)로 진입 → 공개 RPC로 상자를 읽기전용 뷰어로 보여주고,
// 하단 '참여하기'로 내 상자에 참여. 비로그인이면 참여 시 nav.login(appLogin)으로 인라인 로그인.
export function BoxInviteScreen() {
  const { code } = useParams<{ code: string }>();
  const { session } = useSession();
  const { data, isPending, error } = useQuery({
    queryKey: ["box-invite-view", code],
    queryFn: () => getBoxViewByInviteCode(code!),
  });

  if (isPending) return <ScreenLoading />;
  if (error) return <ScreenError />;
  if (!data) return <ScreenError message="찾을 수 없는 상자예요" />;

  return <BoxViewer view={data} isLoggedIn={!!session} code={code!} />;
}
