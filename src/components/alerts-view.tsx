'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useNav } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { formatActivity, type BoxActivityType } from '@/lib/domain/activity-label'
import { formatRelativeTime } from '@/lib/utils'
import { markBoxSeen, type AlertItem } from '@/lib/api/alerts'
import { markAllSeen } from '@/lib/api/boxes'

// 알림함 프리젠테이션 — 웹·토스 공유. 데이터는 getAlerts가 넘긴다.
// 항목 탭 → 그 상자로 앱 내부 이동(딥링크 제약 없음). 푸시는 /alerts 고정 진입만 담당.
// 실시간 구독(useRealtimeAlerts)은 여기서 하지 않는다 — 이 화면이 열려있을 때만 켜지면
// 탭바 배지가 다른 탭에 있는 동안 갱신 안 됨. 앱 셸(toss/src/App.tsx)에서 항상 켠다.
export function AlertsView({ items }: { items: AlertItem[] }) {
  const nav = useNav()
  const qc = useQueryClient()
  const hasUnseen = items.some(a => a.unseen)

  // 탭 즉시 그 상자 알림을 읽음으로(낙관적 반영 → 돌아와도 읽음 유지) + 서버 last_seen 갱신 후 이동.
  function openAlert(a: AlertItem) {
    qc.setQueryData<AlertItem[]>(['alerts'], old => old?.map(x => (x.boxId === a.boxId ? { ...x, unseen: false } : x)))
    markBoxSeen(a.boxId).catch(() => {})
    nav.push(a.optionId ? `/box/${a.boxId}/option/${a.optionId}` : `/box/${a.boxId}`)
  }

  // 모두 읽음 — 내 모든 상자 last_seen 갱신. 홈 들썩임 배지도 함께 정리.
  function markAll() {
    qc.setQueryData<AlertItem[]>(['alerts'], old => old?.map(x => ({ ...x, unseen: false })))
    markAllSeen().catch(() => {})
    qc.invalidateQueries({ queryKey: ['boxes', 'shaking'] })
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-cream/95 px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-3 backdrop-blur-sm">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">알림</h1>
      </header>

      <div className="flex-1 px-5 pb-28 pt-1">
        {items.length === 0 ? (
          <div className="mt-10 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-butter-tint text-ink">
              <Icon name="bell" size={20} />
            </span>
            <p className="text-[13.5px] font-bold text-ink">아직 알림이 없어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">상자에 새 소식이 생기면 여기에 모여요.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map(a => (
              <li key={a.id}>
                <button
                  onClick={() => openAlert(a)}
                  className={`flex w-full items-start gap-3 rounded-card border px-4 py-3 text-left active:bg-cream ${
                    a.unseen ? 'border-butter-dark/40 bg-butter-tint/50' : 'border-[#ECEADC] bg-paper'
                  }`}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-butter-tint text-ink">
                    <Icon name="bell" size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-ink">{a.boxTitle}</span>
                    <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-soft">
                      {formatActivity({
                        type: a.type as BoxActivityType,
                        actorNickname: a.actorNickname,
                        meta: a.meta,
                      })}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-faint">{formatRelativeTime(a.createdAt)}</span>
                  </span>
                  {a.unseen && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-tangerine" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 하단 고정 '모두 읽음' — 안읽음이 있을 때만. 탭바 화면이라 --app-nav-h로 탭바 위에 뜬다. */}
      {hasUnseen && (
        <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 bg-cream/95 px-5 pb-3 pt-2 backdrop-blur">
          <div className="mx-auto max-w-[430px]">
            <button
              onClick={markAll}
              className="w-full rounded-field border border-line bg-paper py-3 text-sm font-bold text-ink-soft active:bg-cream"
            >
              모두 읽음
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
