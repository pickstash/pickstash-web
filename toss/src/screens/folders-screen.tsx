import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { loadFolders } from "@/lib/api/folders-list";
import { FoldersClient } from "@/app/folders/folders-client";
import { ScreenLoading, ScreenError } from "./screen-state";

// 폴더 모아보기(/folders) — 드로어 '폴더' 진입점. 공유 로더+공유 client 재사용.
export function FoldersScreen() {
  const { data, isPending, error } = useQuery({
    queryKey: ["folders"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadFolders(supabase, user.id);
    },
  });

  if (isPending) return <ScreenLoading />;
  if (error || !data) return <ScreenError />;

  return <FoldersClient initialFolders={data.cards} nickname={data.nickname} me={data.me} />;
}
