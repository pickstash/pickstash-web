import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { loadBoxDetail } from "@/lib/api/box-detail";
import { BoxDetailClient } from "@/app/box/[id]/box-detail-client";
import { ScreenLoading, ScreenError } from "./screen-state";

// 토스 상자 상세 = 공유 로더(loadBoxDetail)로 CSR fetch → 공유 client 렌더. 웹과 동일.
export function BoxDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error } = useQuery({
    queryKey: ["box-detail", id],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return { r: await loadBoxDetail(supabase, id!, user.id), userId: user.id };
    },
  });

  if (isPending) return <ScreenLoading />;
  if (error || !data) return <ScreenError />;
  if (data.r.status !== "ok") return <ScreenError message="열 수 없는 상자예요" />;

  return (
    <BoxDetailClient
      box={data.r.box}
      currentUserId={data.userId}
      initialOptions={data.r.options}
      initialIsFavorite={data.r.isFavorite}
    />
  );
}
