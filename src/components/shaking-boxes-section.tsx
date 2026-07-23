'use client'

import Link from 'next/link'
import { useShakingBoxes, useMarkAllSeen } from '@/hooks/use-boxes'
import { formatActivity, type ActivityInfo } from '@/lib/domain/activity-label'
import { Icon } from '@/components/icon'

export function ShakingBoxesSection() {
  const { data: items = [], isLoading } = useShakingBoxes()
  const markAll = useMarkAllSeen()

  return (
    <section className="px-5 pt-4">
      <div className="rounded-card bg-butter-tint p-3.5">
        <div className="flex items-center justify-between px-0.5">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-ink">
              <Icon name="bell" size={15} />
              지금 들썩이는 상자
            </p>
            <p className="mt-0.5 text-[11px] text-[#99885B]">새로운 소식이 있는 상자예요</p>
          </div>
          {items.length > 0 && (
            <button
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="text-[11px] font-semibold text-[#99885B] active:opacity-70"
            >
              모두 확인 처리
            </button>
          )}
        </div>

        {items.length > 0 ? (
          <div className="mt-2.5 space-y-2">
            {items.map(({ box, latestActivity }) => (
              <Link key={box.id} href={`/box/${box.id}`} className="block">
                <div className="flex items-center gap-2.5 rounded-field bg-paper px-3.5 py-3 shadow-[0_1px_4px_rgba(42,42,39,0.05)] active:bg-cream">
                  <span className="shrink-0 rounded-full bg-butter px-2 py-0.5 text-[11px] font-extrabold text-ink">N</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-ink">{box.title}</span>
                    {latestActivity && (
                      <span className="block truncate text-[11.5px] text-ink-soft">
                        {formatActivity(latestActivity as ActivityInfo)}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-extrabold text-[#C9C7B6]">›</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          !isLoading && (
            <div className="mt-2.5 rounded-field bg-paper/70 px-4 py-5 text-center">
              <p className="text-[13px] font-bold text-ink">아직 들썩이는 상자가 없네요</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-soft">
                친구들이 의견을 더하면 상자가<br />다시 들썩이기 시작할거에요!
              </p>
            </div>
          )
        )}
      </div>
    </section>
  )
}
