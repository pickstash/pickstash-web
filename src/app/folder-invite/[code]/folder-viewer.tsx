import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { formatDday } from '@/lib/utils'
import type { FolderViewerData, FolderViewerBox } from '@/lib/api/folder-invites'
import { JoinFolderClient } from './join-folder-client'

function StatusBadge({ closedAt }: { closedAt: string | null }) {
  return closedAt ? (
    <span className="shrink-0 rounded-full bg-leaf-tint px-2 py-0.5 text-[10.5px] font-bold text-[#37714A]">정리완료</span>
  ) : (
    <span className="shrink-0 rounded-full border border-[#D9D6C2] bg-paper px-2 py-0.5 text-[10.5px] font-bold text-ink-soft">정리중</span>
  )
}

function ViewerAvatars({ participants, max = 4 }: { participants: FolderViewerBox['participants']; max?: number }) {
  const shown = participants.slice(0, max)
  const extra = participants.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map(p => (
        <div key={p.id} className="flex h-[22px] w-[22px] items-center justify-center overflow-hidden rounded-full border border-paper bg-cream text-[9px] font-bold text-ink">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            p.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-paper bg-cream text-[9px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

function BoxCard({ box }: { box: FolderViewerBox }) {
  const isAuto = box.decision_mode === 'auto_deadline'
  return (
    <AppLink
      href={`/invite/${box.invite_code}`}
      className="block rounded-[18px] border border-[#ECEADC] bg-paper p-4 shadow-[0_2px_10px_rgba(42,42,39,0.05)] active:bg-butter-tint/40"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 text-[15px] font-extrabold leading-snug tracking-tight text-ink">{box.title}</h3>
        <StatusBadge closedAt={box.closed_at} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] font-semibold text-ink-faint">
        {isAuto && box.deadline_at && (
          <span className="inline-flex items-center gap-1">
            <Icon name="calendar" size={12} />
            마감 {formatDday(box.deadline_at)}
          </span>
        )}
        {box.total_likes > 0 && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Icon name="heart" size={12} />
            {box.total_likes}
          </span>
        )}
        {box.participant_count > 1 && (
          <span className="inline-flex items-center gap-1.5">
            <ViewerAvatars participants={box.participants} />
            {box.participant_count}명
          </span>
        )}
      </div>
    </AppLink>
  )
}

interface FolderViewerProps {
  view: FolderViewerData
  isLoggedIn: boolean
  code: string
}

export function FolderViewer({ view, isLoggedIn, code }: FolderViewerProps) {
  return (
    <main className="flex min-h-dvh flex-col bg-cream">
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-butter-tint px-2.5 py-1 text-[11px] font-bold text-ink">
          <Icon name="folder" size={12} />
          공유된 서랍
        </span>
        <h1 className="mt-3 text-[24px] font-extrabold leading-tight tracking-tight text-ink text-balance">{view.name}</h1>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          {view.member_count > 0 ? `${view.member_count}명 참여 · ` : ''}상자 {view.boxes.length}개
        </p>
      </header>

      <div className="flex-1 space-y-2.5 px-5 pb-32 pt-3">
        {view.boxes.length === 0 ? (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">이 서랍엔 아직 상자가 없어요</p>
          </div>
        ) : (
          view.boxes.map(box => <BoxCard key={box.id} box={box} />)
        )}
      </div>

      {/* 하단 고정 CTA: 참여(전체 상자 참여 + 폴더 복사) */}
      <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
        <p className="mb-2 text-center text-[11.5px] text-ink-faint">
          참여하면 서랍 안 상자에 모두 참여하고, 서랍이 내 창고에 담겨요.
        </p>
        <JoinFolderClient code={code} isLoggedIn={isLoggedIn} />
      </div>
    </main>
  )
}
