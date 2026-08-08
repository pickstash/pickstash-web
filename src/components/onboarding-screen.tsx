import { AppLink } from '@/lib/nav/nav'

// 완전 신규(상자·서랍 0) 전용 온보딩 — 탭바·광고·햄버거 메뉴 없이 상자 만들기에 집중한 화면. 웹·토스 공유.
// 브랜드 헤더(로고+미니앱 이름)는 있다 — 앱인토스 심사 요건: 표준 내비게이션 바 위치에
// 콘솔 등록 정보와 동일한 로고·이름이 보여야 한다. 신규 유저의 첫 화면이라 특히 중요.
// "○○님의 결정창고에서 / 상자를 만들어볼까요?"로 첫 행동(상자 만들기)을 분명히 한다.
// ('첫'은 다 지운 복귀자도 볼 수 있어 뺀다 — 게이트는 데이터 0만으로 판별.)
const STEPS: [string, string][] = [
  ['1', '고민을 상자로 만들고'],
  ['2', '후보·링크를 담고'],
  ['3', '비교하고 정리해요'],
]

export function OnboardingScreen({ nickname }: { nickname: string }) {
  return (
    <main className="flex min-h-dvh flex-col bg-cream pb-[calc(var(--app-safe-bottom,0px)+2rem)]">
      {/* 브랜드 헤더 — 아이콘 + 콘솔 등록명 그대로("결정창고", 닉네임 개인화 없이) */}
      <header className="flex items-center gap-2 px-6 pt-[calc(env(safe-area-inset-top)+1rem)] pb-2">
        <img src="/icons/character.png" alt="" className="h-6 w-auto" />
        <span className="text-[15px] font-extrabold tracking-tight text-ink">결정창고</span>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto flex w-full max-w-[340px] flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon_heart.svg" alt="" className="h-14 w-auto" />

          {/* 인사(작게·옅게) → 헤드라인(주인공) → 한 줄 설명 : 한 호흡으로 읽히게 */}
          <div className="mt-6">
            <p className="text-[18px]">{nickname}님의 결정창고에서</p>
            <h1 className="mt-1 text-[25px] font-extrabold leading-[1.25] tracking-tight text-ink text-balance">
              상자를 만들어볼까요?
            </h1>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
              정하기 어려운 걸 상자에 담아
              <br />
              혼자 정리하거나 친구랑 투표해요.
            </p>
          </div>

          {/* 3스텝 — 박스 대신 가벼운 리스트(가운데 정렬 그룹, 행은 좌측 정렬) */}
          <div className="mx-auto mt-8 flex w-fit flex-col gap-3.5 text-left">
            {STEPS.map(([n, t]) => (
              <div key={n} className="flex items-center gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-butter text-[13px] font-extrabold text-ink">
                  {n}
                </span>
                <span className="text-[13.5px] font-semibold text-ink">{t}</span>
              </div>
            ))}
          </div>

          {/* 액션 — 새 상자 하나에 집중(초대는 상자를 만든 뒤 상자 상세에서). */}
          <div className="mt-10 w-full">
            <AppLink href="/box/new" className="block">
              <button className="flex w-full items-center justify-center gap-1.5 rounded-field bg-ink py-4 text-sm font-extrabold text-cream active:opacity-80">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                상자 만들기
              </button>
            </AppLink>
          </div>
        </div>
      </div>
    </main>
  )
}
