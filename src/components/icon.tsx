import type { CSSProperties, ReactNode } from 'react'

// 결정창고 아이콘 가족 — 하나의 라인 스타일(둥근 끝·잉크색). 경로는 검증된 Feather 지오메트리.
// 활성/강조는 fill-* stroke-* 유틸(예: 즐겨찾기 별 = fill-butter stroke-butter-dark).
// 이모지·시스템 글리프 대신 구조 아이콘은 전부 이 컴포넌트를 쓴다.

export type IconName =
  | 'star'
  | 'heart'
  | 'back'
  | 'close'
  | 'plus'
  | 'menu'
  | 'trash'
  | 'chevronRight'
  | 'search'
  | 'share'
  | 'link'
  | 'mapPin'
  | 'play'
  | 'box'
  | 'check'
  | 'bell'
  | 'more'
  | 'calendar'

function inner(name: IconName): ReactNode {
  switch (name) {
    case 'star':
      return <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    case 'heart':
      return <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    case 'back':
      return <polyline points="15 18 9 12 15 6" />
    case 'close':
      return (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      )
    case 'plus':
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </>
      )
    case 'menu':
      return (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )
    case 'trash':
      return (
        <>
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </>
      )
    case 'chevronRight':
      return <polyline points="9 18 15 12 9 6" />
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </>
      )
    case 'share':
      return (
        <>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </>
      )
    case 'link':
      return (
        <>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </>
      )
    case 'mapPin':
      return (
        <>
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </>
      )
    case 'play':
      return <polygon points="5 3 19 12 5 21 5 3" />
    case 'box':
      return (
        <>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </>
      )
    case 'check':
      return (
        <>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </>
      )
    case 'bell':
      return (
        <>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </>
      )
    case 'more':
      return (
        <>
          <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </>
      )
    case 'calendar':
      return (
        <>
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="8" y1="2.5" x2="8" y2="6" />
          <line x1="16" y1="2.5" x2="16" y2="6" />
        </>
      )
  }
}

interface IconProps {
  name: IconName
  size?: number
  /** 채움(currentColor). 별은 fill-butter stroke-butter-dark 클래스로 투톤 처리. */
  filled?: boolean
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}

export function Icon({ name, size = 22, filled = false, className, style, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {inner(name)}
    </svg>
  )
}
