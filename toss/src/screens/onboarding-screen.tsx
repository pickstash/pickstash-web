import { AppLink } from "@/lib/nav/nav";
import { FriendInviteButton } from "@/components/friend-invite-button";

// 첫 로그인(상자 0개) 전용 온보딩 — 헤더·탭바 없이 전체 화면, 하단엔 배너만(App이 AdBanner를 함께 렌더).
// "○○님의 결정창고에서 / 첫 상자를 만들어볼까요?"로 시작해 첫 행동(상자 만들기)을 분명히 한다.
const STEPS: [string, string][] = [
  ["1", "고민을 상자로 만들고"],
  ["2", "후보·링크를 담고"],
  ["3", "비교하고 정해요"],
];

export function OnboardingScreen({ nickname }: { nickname: string }) {
  return (
    <main className="flex min-h-dvh flex-col justify-center bg-cream px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-[calc(var(--app-safe-bottom,0px)+2rem)]">
      <div className="mx-auto flex w-full max-w-[360px] flex-col items-center gap-5 text-center">
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img src="/icons/icon_heart.svg" alt="" className="h-14 w-auto" />

        <div>
          <p className="text-[12.5px] font-semibold text-ink-faint">{nickname}님의 결정창고에서</p>
          <h1 className="mt-1.5 text-[23px] font-extrabold leading-tight tracking-tight text-ink text-balance">
            첫 상자를 만들어볼까요?
          </h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">
            정하기 어려운 걸 상자에 담아
            <br />
            혼자 정리하거나 친구랑 투표해요.
          </p>
        </div>

        <div className="w-full space-y-2">
          {STEPS.map(([n, t]) => (
            <div key={n} className="flex items-center gap-3 rounded-[14px] border border-line bg-paper px-4 py-3 text-left">
              <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-butter text-[13px] font-extrabold text-ink">
                {n}
              </span>
              <span className="text-[13px] font-semibold text-ink">{t}</span>
            </div>
          ))}
        </div>

        <div className="w-full space-y-2.5 pt-1">
          <AppLink href="/box/new" className="block">
            <button className="flex w-full items-center justify-center gap-1.5 rounded-field bg-ink py-4 text-sm font-extrabold text-cream active:opacity-80">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              새 상자 만들기
            </button>
          </AppLink>
          <FriendInviteButton />
        </div>
      </div>
    </main>
  );
}
