import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { createClient } from "@/lib/supabase/client";
import { loadOptionDetail } from "@/lib/api/option-detail";
import { OptionDetailClient } from "@/app/box/[id]/option/[optionId]/option-detail-client";
import { ScreenLoading, ScreenError } from "./screen-state";

export function OptionDetailScreen() {
  const { id: boxId, optionId } = useParams<{ id: string; optionId: string }>();
  const { data, isPending, error } = useQuery({
    queryKey: ["option-detail", boxId, optionId],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return { r: await loadOptionDetail(supabase, boxId!, optionId!, user.id), userId: user.id };
    },
  });

  if (isPending) return <ScreenLoading />;
  if (error || !data) return <ScreenError />;
  if (data.r.status !== "ok") return <ScreenError message="열 수 없는 선택지예요" />;

  return (
    <OptionDetailClient
      option={data.r.option}
      creator={data.r.creator}
      boxId={boxId!}
      round={data.r.round}
      canVote={data.r.canVote}
      checklist={data.r.checklist}
      currentUserId={data.userId}
      myNickname={data.r.myNickname}
      participants={data.r.participants}
      isParticipant={data.r.isParticipant}
    />
  );
}
