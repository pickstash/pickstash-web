import type { ReactNode } from 'react'

/** 색연필로 슥슥 그린 듯한 손그림 동그라미 스탬프 (정리완료!) — 참여자/읽기전용 화면 공용. */
export function PencilCircle({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex -rotate-3 items-center justify-center px-4 py-1.5">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 120 48"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M62 6C34 4 12 11 8 22C5 33 30 43 60 43C90 43 116 34 112 21C109 10 84 4 52 8"
          stroke="var(--color-tangerine)"
          strokeWidth="2.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M56 10C36 10 17 15 14 22C12 30 33 39 59 39C85 39 108 32 107 23"
          stroke="var(--color-tangerine)"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeOpacity="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative text-[12.5px] font-extrabold tracking-wide text-tangerine">{children}</span>
    </span>
  )
}
