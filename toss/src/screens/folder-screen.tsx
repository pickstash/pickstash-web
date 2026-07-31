import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { loadFolderView } from "@/lib/api/folder-view";
import { FolderView } from "@/app/folder/[id]/folder-view";
import { ScreenLoading, ScreenError } from "./screen-state";

export function FolderScreen() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, error } = useQuery({
    queryKey: ["folder-view", id],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadFolderView(supabase, id!, user.id);
    },
  });

  if (isPending) return <ScreenLoading />;
  if (error || !data) return <ScreenError />;
  if (data.status !== "ok") return <ScreenError message="열 수 없는 폴더예요" />;

  return (
    <FolderView
      folderId={id!}
      folderName={data.folderName}
      inviteCode={data.inviteCode}
      nickname={data.nickname}
      members={data.members}
      initialBoxes={data.items}
    />
  );
}
