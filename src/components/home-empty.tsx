import { AppLink } from '@/lib/nav/nav'
import { setPendingBoxDraft } from '@/lib/nav/pending-box-draft'
import type { BoxMode } from '@/lib/api/boxes'

// 완전 신규(상자 0) 홈. 첫 결정 만들기 마찰을 줄이는 게 목표:
//  - 큰 CTA '새로운 상자 만들기' (빈 제목으로 시작)
//  - 추천 템플릿 — 누르면 제목·종류가 미리 채워진 채 상자 만들기로(원탭 시작)
// 플로팅 새 상자 FAB는 상자≥1일 때만(HomeView) → 빈 홈에선 이 CTA가 주 진입점.
const TEMPLATES: { emoji: string; title: string; mode: BoxMode }[] = [
  { emoji: '🍜', title: '점심 뭐 먹지?', mode: 'decide' },
  { emoji: '🥐', title: '대전 빵지순례 리스트', mode: 'checklist' },
  { emoji: '✈️', title: '여행 어디로 갈까?', mode: 'decide' },
  { emoji: '🛒', title: '장 볼 것 리스트', mode: 'checklist' },
]

export function HomeEmpty() {
  return (
    <section className="pt-1">
      <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 pt-9 pb-7 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-line bg-cream text-[26px]">
            🗳️
          </div>
          <div>
            <p className="text-[16px] font-extrabold tracking-tight text-ink">오늘은 무엇을 정해볼까요?</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">흩어진 후보를 상자에 모아 같이 정해요</p>
          </div>
        </div>
        <div className="mt-6">
          <AppLink href="/box/new" className="block w-full" onClick={() => setPendingBoxDraft(null)}>
            <button className="w-full rounded-field bg-ink py-4 text-sm font-extrabold text-cream active:opacity-80">
              새로운 상자 만들기
            </button>
          </AppLink>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 px-1 text-[13px] font-bold text-ink-soft">이런 걸 정할 수 있어요</p>
        <div className="space-y-2">
          {TEMPLATES.map(t => (
            <AppLink
              key={t.title}
              href="/box/new"
              onClick={() => setPendingBoxDraft({ title: t.title, mode: t.mode })}
              className="flex items-center gap-3 rounded-card border border-[#ECEADC] bg-paper px-4 py-3.5 active:bg-butter-tint/40"
            >
              <span className="text-[20px]">{t.emoji}</span>
              <span className="flex-1 truncate text-[14px] font-bold text-ink">{t.title}</span>
              <span className="shrink-0 rounded-full bg-butter-tint px-2.5 py-1 text-[11.5px] font-extrabold text-ink">시작</span>
            </AppLink>
          ))}
        </div>
      </div>
    </section>
  )
}
