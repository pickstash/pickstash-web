import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { loadBoxList, type BoxListKind } from "@/lib/api/box-list";
import { BoxListView, BOX_LIST_META } from "@/components/box-list-view";
import { ScreenLoading, ScreenError } from "./screen-state";

// 창고 목록(어질러진/정리된/즐겨찾는) — 종류만 다르고 로직·뷰·문구는 공유. 라우트별로 kind만 넘긴다.
export function BoxListScreen({ kind }: { kind: BoxListKind }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["box-list", kind],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadBoxList(supabase, user.id, kind);
    },
  });

  if (isPending) return <ScreenLoading />;
  if (error || !data) return <ScreenError />;

  return <BoxListView {...BOX_LIST_META[kind]} nickname={data.nickname} items={data.items} />;
}
