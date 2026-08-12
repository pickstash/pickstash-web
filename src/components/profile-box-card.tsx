import { AppLink } from '@/lib/nav/nav'
import { ModeChip } from '@/components/mode-chip'
import type { PublicBoxCard } from '@/lib/api/social'

// 프로필(공개/저장함) 그리드 상자 카드 — 내 프로필·남 프로필 공유.
// 제목 먼저(위) → 모드 라벨은 우하단. 고정 높이라 제목이 1줄이든 2줄이든 카드 높이 동일.
// 049: 공개 상자는 /box/[id]가 비로그인 포함 읽기 전용으로 열려서(can_read_box) 항상 /box로 보낸다.
export function ProfileBoxCard({ box }: { box: PublicBoxCard }) {
  const checklist = box.mode === 'checklist'
  return (
    <AppLink href={`/box/${box.id}`} className="block">
      <div className="flex h-[104px] flex-col overflow-hidden rounded-[14px] border border-[#ECEADC] bg-paper p-3 active:bg-butter-tint/40">
        <h4 className="line-clamp-2 text-[13px] font-extrabold leading-snug text-ink">{box.title}</h4>
        {!checklist && box.winner && (
          <p className="mt-1 line-clamp-1 text-[11px] font-bold text-ink-soft">→ {box.winner}</p>
        )}
        {/* 우하단 라벨 — mt-auto로 항상 바닥. pt-2로 제목과 여유. */}
        <div className="mt-auto flex justify-end pt-2">
          <ModeChip mode={box.mode} />
        </div>
      </div>
    </AppLink>
  )
}
