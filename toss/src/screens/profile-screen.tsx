import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { loadProfile } from "@/lib/api/profile";
import { ProfileClient } from "@/app/profile/profile-client";
import { ScreenLoading, ScreenError } from "./screen-state";

export function ProfileScreen() {
  const { data, isPending, error } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      const p = await loadProfile(supabase, user.id);
      // 카카오 아바타는 웹 전용(토스는 없음 → null)
      const kakaoAvatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null;
      return { userId: user.id, ...p, kakaoAvatarUrl };
    },
  });

  if (isPending) return <ScreenLoading />;
  if (error || !data) return <ScreenError />;

  return (
    <ProfileClient
      userId={data.userId}
      nickname={data.nickname}
      avatarUrl={data.avatarUrl}
      kakaoAvatarUrl={data.kakaoAvatarUrl}
    />
  );
}
