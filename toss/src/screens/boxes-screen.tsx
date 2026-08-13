import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase/client";
import { loadAllBoxCards, reorderMyBoxes } from "@/lib/api/box-list";
import { loadFolders } from "@/lib/api/folders-list";
import { CreateFab } from "@/components/create-fab";
import { BoxSummaryCard } from "@/components/box-summary-card";
import { SortableList, SortableItem, lockX } from "@/components/sortable-list";
import { Spinner } from "@/components/spinner";
import { FoldersClient } from "@/app/folders/folders-client";
import type { BoxCard } from "@/lib/domain/home";

// '서랍' 탭 — 상자 전체 목록 + 서랍을 한 탭 안에서 상위 토글로 분리. 탭바에 서랍 전용 탭을
// 따로 안 넣는 이유: 자리 부족(토스는 하단 탭바가 유일한 1차 내비, 햄버거 드로어 없음).
// 서랍을 상자 종류(전체/결정/체크) 칩과 나란히 두면 "종류"처럼 보여 어색해서, 다른 레벨의
// 토글(서랍/상자)로 분리하고 상자 모드에서만 그 아래 종류 칩이 나온다.
// 서랍 뷰는 홈 '새 서랍'이 가는 /folders와 같은 FoldersClient를 그대로 임베드한다(embedded) —
// 예전 읽기전용 복제 그리드는 폐기. 이제 어느 진입점이든 생성·이름변경·나가기·초대가 동일하게 된다.
type View = "box" | "folder";
type TypeFilter = "all" | "decide" | "checklist";
const TYPE_CHIPS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "decide", label: "결정하기" },
  { key: "checklist", label: "모아보기" },
];

export function BoxesScreen() {
  // 상자/서랍 상위 토글은 URL 쿼리로 — 서랍 목록에서 폴더 상세로 들어갔다 뒤로가면 이 화면이
  // 리마운트되면서 useState라면 "상자"로 리셋된다. history에 실린 URL로 복원해야 토글이 유지된다.
  const [searchParams, setSearchParams] = useSearchParams();
  const explicitView = searchParams.get("view"); // "folder" | "box" | null(=아직 안 고름)
  const hasExplicit = explicitView === "folder" || explicitView === "box";
  // 토글을 누르면 항상 명시적으로 기록(box도) — 안 그러면 스마트 기본값이 다시 서랍으로 튄다.
  function setView(next: View) {
    setSearchParams({ view: next }, { replace: true });
  }
  const [type, setType] = useState<TypeFilter>("all");

  // 쿼리 키는 원래 loadBoxList 시절 그대로(["box-list","all"]) 유지 — use-boxes.ts/use-favorites.ts의
  // 기존 무효화(qc.invalidateQueries({queryKey:['box-list']}))가 이 화면도 계속 커버하게 하기 위함.
  const { data: cards, isPending: boxPending, error: boxError } = useQuery({
    queryKey: ["box-list", "all"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadAllBoxCards(supabase, user.id);
    },
  });

  // 서랍은 스마트 기본값 판단(서랍 있으면 서랍부터)에도 필요해 항상 불러온다.
  const { data: folderData, isPending: folderPending, error: folderError } = useQuery({
    queryKey: ["folders-page"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadFolders(supabase, user.id);
    },
  });

  // 낙관적 전체 순서 — 서버 목록(활동순 리셋 포함)이 바뀌면 다시 동기화(렌더 중 파생, effect 없음).
  const fullCards = cards ?? [];
  const cardsKey = fullCards.map(c => c.id).join(",");
  const [ord, setOrd] = useState<{ key: string; list: BoxCard[] }>({ key: cardsKey, list: fullCards });
  if (ord.key !== cardsKey) setOrd({ key: cardsKey, list: fullCards });
  const fullOrder = ord.list;

  const queryClient = useQueryClient();
  const reorder = useMutation({
    mutationFn: (orderedBoxIds: string[]) => reorderMyBoxes(orderedBoxIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["box-list"] }),
  });

  const items = fullOrder.filter(c => type === "all" || c.mode === type);
  const folders = folderData?.cards ?? [];

  // 필터 상태에서도 드래그 — 보이는(필터된) 항목만 재정렬하고, 숨은 항목은 원래 슬롯에 그대로 두어
  // 전체 순서에 끼워 넣은 뒤 저장(box_participants.sort는 개인별 절대 순서라 부분 목록만 저장하면 꼬인다).
  function onReorder(nextVisible: BoxCard[]) {
    const visibleIds = new Set(nextVisible.map(c => c.id));
    let vi = 0;
    const nextFull = fullOrder.map(c => (visibleIds.has(c.id) ? nextVisible[vi++] : c));
    setOrd({ key: cardsKey, list: nextFull });
    reorder.mutate(nextFull.map(c => c.id));
  }

  // 스마트 기본값: 토글을 안 건드렸으면 서랍이 1개라도 있을 때 서랍부터, 없으면 상자부터.
  // 서랍 로딩 중엔 확정 못 하니 대기(상자→서랍 깜빡임 방지).
  const resolving = !hasExplicit && folderPending;
  const view: View = hasExplicit ? (explicitView as View) : (folders.length > 0 ? "folder" : "box");

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">서랍</h1>

        {/* 상위 토글 — 상자/서랍은 종류가 아니라 서로 다른 보기라 칩과 분리된 큰 세그먼트로.
            탭 이름이 '서랍'이라 서랍을 왼쪽(먼저)에 둔다. */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-[#EDEBDD] p-1">
          {([["folder", "서랍"], ["box", "상자"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`rounded-full py-2 text-[13px] font-bold transition-colors ${
                view === key ? "bg-ink text-cream shadow-sm" : "text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!resolving && view === "box" && (
          <div className="mt-3 flex gap-1.5">
            {TYPE_CHIPS.map(c => (
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
        )}
      </header>

      {/* 서랍 뷰는 FoldersClient가 자체 px-5·pb-28·FAB을 들고 오므로 이 래퍼 패딩을 빼야 이중 들여쓰기가 안 난다 */}
      <div className={view === "folder" && !resolving ? "flex flex-1 flex-col pt-1" : "flex-1 px-5 pb-28 pt-1"}>
        {resolving ? (
          <Spinner className="py-10" />
        ) : view === "folder" ? (
          folderPending ? (
            <Spinner className="py-10" />
          ) : folderError || !folderData ? (
            <p className="py-10 text-center text-[13px] text-tomato">서랍을 불러오지 못했어요</p>
          ) : (
            // 홈 '새 서랍'(/folders)과 동일한 관리 화면을 헤더만 빼고 임베드 — 생성·이름변경·나가기·초대 전부 여기서.
            <FoldersClient embedded initialFolders={folders} nickname={folderData.nickname} me={folderData.me} />
          )
        ) : (
          <div className="space-y-2.5">
            {boxPending ? (
              <Spinner className="py-10" />
            ) : boxError ? (
              <p className="py-10 text-center text-[13px] text-tomato">목록을 불러오지 못했어요</p>
            ) : items.length > 0 ? (
              <SortableList items={items} getId={c => c.id} strategy={verticalListSortingStrategy} modifiers={[lockX]} onReorder={onReorder}>
                {card => (
                  <SortableItem key={card.id} id={card.id}>
                    <BoxSummaryCard card={card} />
                  </SortableItem>
                )}
              </SortableList>
            ) : (
              <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
                <p className="text-[13.5px] font-bold text-ink">상자가 없어요</p>
                <p className="mt-1 text-[12px] text-ink-soft">아래 버튼으로 새 상자를 만들어보세요.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 서랍 뷰 FAB은 FoldersClient가 자체 제공(만들기 시트). 상자 뷰만 여기서 새 상자 FAB. */}
      {!resolving && view === "box" && <CreateFab href="/box/new" label="새 상자" />}
    </main>
  );
}
