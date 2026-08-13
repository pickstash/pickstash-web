// 상자 목적 라벨 — 모아보기(leaf)/결정하기(tangerine). 상세·프로필·목록·서랍 어디서나 동일 스타일.
// 기준은 상자 상세 칩(rounded-full·text-xs·font-bold).
export function ModeChip({ mode }: { mode: 'decide' | 'checklist' }) {
  const checklist = mode === 'checklist'
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
        checklist ? 'bg-leaf-tint text-[#37714A]' : 'bg-tangerine-tint text-[#B85E28]'
      }`}
    >
      {checklist ? '모아보기' : '결정하기'}
    </span>
  )
}
