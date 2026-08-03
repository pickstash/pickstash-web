import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { loadBoxList, type BoxListKind } from "@/lib/api/box-list";
import { AppLink } from "@/lib/nav/nav";
import { BoxCard } from "@/components/box-card";
import { BOX_LIST_META } from "@/components/box-list-view";

// '상자' 탭 — 진행중/정리됨/즐겨찾기를 필터 하나로 통합(옛 창고 3장 카드 대체). loadBoxList·BoxCard 재사용.
const FILTERS: { kind: BoxListKind; label: string }[] = [
  { kind: "messy", label: "진행중" },
  { kind: "done", label: "정리됨" },
  { kind: "favorites", label: "즐겨찾기" },
];

export function BoxesScreen() {
  const [kind, setKind] = useState<BoxListKind>("messy");
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

  return (
    <main className="flex min-h-dvh flex-col">
      {/* 탭 루트 — 뒤로가기 없음. 제목 + 필터 칩 */}
      <header className="sticky top-0 z-20 bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">상자</h1>
        <div className="mt-3 flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.kind}
              onClick={() => setKind(f.kind)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold ${
                kind === f.kind
                  ? "border-butter-dark bg-butter-tint text-ink"
                  : "border-line bg-paper text-ink-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-2.5 px-5 pb-28 pt-1">
        {isPending ? (
          <p className="py-10 text-center text-[13px] text-ink-faint">불러오는 중…</p>
        ) : error || !data ? (
          <p className="py-10 text-center text-[13px] text-tomato">목록을 불러오지 못했어요</p>
        ) : data.items.length > 0 ? (
          data.items.map(({ box, participants, winnerName, isFavorite }) => (
            <BoxCard
              key={box.id}
              box={box}
              participants={participants}
              winnerName={winnerName}
              isFavorite={isFavorite}
            />
          ))
        ) : (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">{BOX_LIST_META[kind].emptyTitle}</p>
            <p className="mt-1 text-[12px] text-ink-soft">{BOX_LIST_META[kind].emptyDesc}</p>
          </div>
        )}
      </div>

      {/* 하단 고정 '새 상자' CTA — 홈과 동일. 탭바 위(--app-nav-h)에 뜬다. */}
      <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)]">
        <AppLink href="/box/new" className="block">
          <button className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80">
            새로운 상자 만들기
          </button>
        </AppLink>
      </div>
    </main>
  );
}
