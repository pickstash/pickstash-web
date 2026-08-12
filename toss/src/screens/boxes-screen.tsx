import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { loadAllBoxCards } from "@/lib/api/box-list";
import { loadFolders } from "@/lib/api/folders-list";
import { AppLink } from "@/lib/nav/nav";
import { CreateFab } from "@/components/create-fab";
import { BoxSummaryCard } from "@/components/box-summary-card";
import { Icon } from "@/components/icon";
import { Spinner } from "@/components/spinner";
import type { FolderCard } from "@/app/folders/folders-client";

// '상자' 탭 — 상자 전체 목록 + 서랍 목록을 한 탭 안에서 상위 토글로 분리. 탭바에 서랍 전용 탭을
// 새로 안 넣는 이유: 자리 부족(토스는 하단 탭바가 유일한 1차 내비, 햄버거 드로어 없음). 대신
// 서랍을 상자 종류(전체/결정/체크)와 나란한 칩으로 두면 "종류"처럼 보여 어색해서, 아예 다른
// 레벨의 토글(상자/서랍)로 분리하고 상자 모드에서만 그 아래 종류 칩이 나온다.
// 서랍 카드 디자인은 실제 /folders 페이지(folders-client.tsx)와 톤 통일(2열 그리드·버터틴트 카드·
// 아바타/혼자쓰는서랍 표기) — 관리(이름변경·나가기·초대)는 그 페이지가 전담이라 여긴 보기+이동만.
type View = "box" | "folder";
type TypeFilter = "all" | "decide" | "checklist";
const TYPE_CHIPS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "decide", label: "결정형" },
  { key: "checklist", label: "모아보기" },
];

function FolderMemberAvatars({ members, max = 3 }: { members: FolderCard["members"]; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map(m => (
        <div key={m.id} className="flex h-[22px] w-[22px] items-center justify-center overflow-hidden rounded-full border border-paper bg-butter-tint text-[9px] font-bold text-ink">
          {m.avatar_url ? (
            <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            m.nickname?.[0] ?? "?"
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-paper bg-cream text-[9px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  );
}

function FolderGridCard({ folder }: { folder: FolderCard }) {
  const isShared = folder.members.length > 1;
  return (
    <AppLink
      href={`/folder/${folder.id}`}
      className="flex flex-col rounded-[18px] border border-butter-dark/25 bg-butter-tint/50 p-4 active:bg-butter-tint"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink-soft">
        <Icon name="folder" size={18} />
      </span>
      <h3 className="mt-2.5 line-clamp-2 min-h-[2.5em] text-[15px] font-extrabold leading-tight tracking-tight text-ink">{folder.name}</h3>
      <div className="mt-2 space-y-1 text-[12px] font-semibold text-ink-soft">
        <div className="tabular-nums">상자 {folder.boxCount}개</div>
        {isShared ? (
          <div className="flex items-center gap-1.5">
            <FolderMemberAvatars members={folder.members} />
            <span>{folder.members.length}명</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Icon name="folder" size={12} />
            혼자 쓰는 서랍
          </div>
        )}
      </div>
    </AppLink>
  );
}

export function BoxesScreen() {
  // 상자/서랍 상위 토글은 URL 쿼리로 — 서랍 목록에서 폴더 상세로 들어갔다 뒤로가면 이 화면이
  // 리마운트되면서 useState라면 "상자"로 리셋된다. history에 실린 URL로 복원해야 토글이 유지된다.
  const [searchParams, setSearchParams] = useSearchParams();
  const view: View = searchParams.get("view") === "folder" ? "folder" : "box";
  function setView(next: View) {
    setSearchParams(next === "box" ? {} : { view: next }, { replace: true });
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

  const { data: folderData, isPending: folderPending, error: folderError } = useQuery({
    queryKey: ["folders-page"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("세션이 없어요");
      return loadFolders(supabase, user.id);
    },
    enabled: view === "folder",
  });

  const items = (cards ?? []).filter(c => type === "all" || c.mode === type);
  const folders = folderData?.cards ?? [];

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">상자</h1>

        {/* 상위 토글 — 상자/서랍은 종류가 아니라 서로 다른 보기라 칩과 분리된 큰 세그먼트로 */}
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-[#EDEBDD] p-1">
          {([["box", "상자"], ["folder", "서랍"]] as const).map(([key, label]) => (
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

        {view === "box" && (
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

      <div className="flex-1 px-5 pb-28 pt-1">
        {view === "folder" ? (
          folderPending ? (
            <Spinner className="py-10" />
          ) : folderError ? (
            <p className="py-10 text-center text-[13px] text-tomato">서랍을 불러오지 못했어요</p>
          ) : folders.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {folders.map(f => <FolderGridCard key={f.id} folder={f} />)}
            </div>
          ) : (
            <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
              <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-butter-tint text-ink">
                <Icon name="folder" size={20} />
              </span>
              <p className="text-[13.5px] font-bold text-ink">아직 서랍이 없어요</p>
              <p className="mt-1 text-[12px] text-ink-soft">여행·집들이처럼 주제로 상자를 묶어보세요.</p>
            </div>
          )
        ) : (
          <div className="space-y-2.5">
            {boxPending ? (
              <Spinner className="py-10" />
            ) : boxError ? (
              <p className="py-10 text-center text-[13px] text-tomato">목록을 불러오지 못했어요</p>
            ) : items.length > 0 ? (
              items.map(card => <BoxSummaryCard key={card.id} card={card} />)
            ) : (
              <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
                <p className="text-[13.5px] font-bold text-ink">상자가 없어요</p>
                <p className="mt-1 text-[12px] text-ink-soft">아래 버튼으로 새 상자를 만들어보세요.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {view === "folder" ? (
        <CreateFab href="/folders" label="새 서랍" />
      ) : (
        <CreateFab href="/box/new" label="새 상자" />
      )}
    </main>
  );
}
