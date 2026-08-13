'use client'

import { createPortal } from 'react-dom'
import { Icon } from '@/components/icon'
import { useNav } from '@/lib/nav/nav'

// 첨부 사진 확대 보기 — target=_blank(새 탭/토스 인앱 브라우저)로 여는 대신 앱 안에서 모달로 띄운다.
// 이유: 아이폰에서 인앱 브라우저로 열면 화면이 꺼지지 않는 이슈가 있었고, 갤럭시에서는 별도 브라우저로
// 열려 이탈감이 컸다. 토스 인앱 브라우저의 상단 X 버튼은 SDK로 제거·커스텀할 수 없어 대신 이 방식으로 우회한다.
export function ImageLightbox({
  open,
  src,
  onClose,
}: {
  open: boolean
  src: string | null
  onClose: () => void
}) {
  const nav = useNav()
  if (!open || !src || typeof document === 'undefined') return null
  // 토스 인앱은 우상단에 시스템 닫기(X) 버튼이 고정으로 뜨므로 우리 닫기 버튼은 좌상단으로 피한다.
  // (웹은 우상단 유지. 어느 쪽이든 배경 탭으로도 닫힌다.)
  const closeSide = nav.platform === 'toss' ? 'left-4' : 'right-4'
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/90" onClick={onClose}>
      {/* 라벨 있는 닫기 알약 — 토스 인앱은 우상단 시스템 X를 사진 닫기로 착각해 누르는 불만이 있어
          우리 버튼을 '사진 닫기' 텍스트로 명확히 한다(텍스트가 아이콘 왼쪽). */}
      <button
        onClick={onClose}
        aria-label="사진 닫기"
        className={`absolute ${closeSide} top-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center gap-1.5 rounded-full bg-ink/60 py-1.5 pl-3.5 pr-2.5 text-[13px] font-bold text-white`}
      >
        사진 닫기
        <Icon name="close" size={18} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="첨부 사진"
        className="max-h-[90dvh] max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  )
}
