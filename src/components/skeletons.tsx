import { PageHeader } from './page-header'
import { AppDrawer } from './app-drawer'

/** 회색 뼈대 블록 (부모의 animate-pulse로 함께 반짝인다) */
function Bar({ className }: { className?: string }) {
  return <div className={`rounded bg-line ${className ?? ''}`} />
}

function BoxCardSkeleton() {
  return (
    <div className="rounded-card border border-[#ECEADC] bg-paper px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <Bar className="h-4 w-1/2" />
        <Bar className="h-5 w-14 rounded-full" />
      </div>
      <Bar className="mt-3 h-3 w-2/5" />
      <Bar className="mt-2 h-3 w-1/3" />
    </div>
  )
}

/** 창고 목록(어질러진·정리된·즐겨찾는) 로딩 뼈대 */
export function ListPageSkeleton({ title }: { title: string }) {
  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title={title} />
      <div className="flex-1 animate-pulse px-5 pb-10">
        <Bar className="mb-4 mt-1 h-3.5 w-2/3" />
        <div className="space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <BoxCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </main>
  )
}

/** 상자 상세 로딩 뼈대 (히어로 + 선택지) */
export function BoxDetailSkeleton() {
  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader />
      <div className="flex-1 animate-pulse space-y-5 px-5 pb-5 pt-1">
        <div className="space-y-3">
          <Bar className="h-5 w-16 rounded-full" />
          <Bar className="h-7 w-3/4" />
          <Bar className="h-10 w-full rounded-[14px]" />
          <div className="flex gap-2.5">
            <Bar className="h-8 w-40 rounded-full" />
            <Bar className="h-8 w-20 rounded-full" />
          </div>
        </div>
        <Bar className="h-4 w-24" />
        <div className="space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-[18px] border border-[#ECEADC] bg-paper p-3.5">
              <div className="flex items-start justify-between gap-3">
                <Bar className="h-4 w-1/3" />
                <Bar className="h-14 w-14 rounded-[12px]" />
              </div>
              <Bar className="mt-3 h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

/** 홈(창고 대문) 로딩 뼈대 */
export function HomeSkeleton() {
  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4">
        <div className="h-6 w-44 animate-pulse rounded bg-line" />
        <AppDrawer nickname="" />
      </header>

      <div className="px-5">
        <div className="animate-pulse rounded-card bg-butter-tint p-3.5">
          <div className="h-4 w-28 rounded bg-paper/70" />
          <div className="mt-2.5 space-y-2">
            <div className="h-14 rounded-field bg-paper" />
            <div className="h-14 rounded-field bg-paper" />
          </div>
        </div>
      </div>

      <div className="flex-1 animate-pulse space-y-2.5 px-5 py-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-card border border-[#ECEADC] bg-paper px-4 py-4">
            <div className="h-10 w-10 rounded-[14px] bg-cream" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="h-2.5 w-20" />
              <Bar className="h-4 w-28" />
            </div>
            <Bar className="h-6 w-6" />
          </div>
        ))}
      </div>
    </main>
  )
}
