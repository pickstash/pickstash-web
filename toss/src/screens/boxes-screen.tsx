import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { loadBoxList } from "@/lib/api/box-list";
import { CreateFab } from "@/components/create-fab";
import { BoxCard } from "@/components/box-card";
import { Spinner } from "@/components/spinner";

// '상자' 탭 — 전체 상자 관리소. 진행/정리 안 나눈 단일 스트림(최근 활동순) + 종류 필터.
// 홈(대시보드·요약)과 차별: 여기는 '전부 찾는 곳'.
type TypeFilter = "all" | "decide" | "checklist";
const CHIPS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "decide", label: "결정" },
  { key: "checklist", label: "체크" },
];

export function BoxesScreen() {
  const [type, setType] = useState<TypeFilter>("all");
  const { data, isPending, error } = useQuery({
    queryKey: ["box-list", "all"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadBoxList(supabase, user.id, "all");
    },
  });

  const items = (data?.items ?? []).filter(i =>
    type === "all" ? true : type === "checklist" ? i.box.mode === "checklist" : i.box.mode !== "checklist",
  );

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">상자</h1>
        <div className="mt-3 flex gap-1.5">
          {CHIPS.map(c => (
            <button
              key={c.key}
              onClick={() => setType(c.key)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${
                type === c.key ? "border-butter-dark bg-butter-tint text-ink" : "border-line bg-paper text-ink-soft"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-2.5 px-5 pb-28 pt-1">
        {isPending ? (
          <Spinner className="py-10" />
        ) : error ? (
          <p className="py-10 text-center text-[13px] text-tomato">목록을 불러오지 못했어요</p>
        ) : items.length > 0 ? (
          items.map(({ box, participants, winnerName, isFavorite }) => (
            <BoxCard key={box.id} box={box} participants={participants} winnerName={winnerName} isFavorite={isFavorite} />
          ))
        ) : (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">상자가 없어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">아래 버튼으로 새 상자를 만들어보세요.</p>
          </div>
        )}
      </div>

      <CreateFab href="/box/new" label="새 상자" />
    </main>
  );
}
