import type { ReactNode } from 'react'
import { PageHeader } from './page-header'

/** 이용약관·개인정보처리방침 등 법적 고지 문서의 공통 레이아웃 (웹 전용 정적 페이지) */
export function LegalDoc({
  title,
  effectiveDate,
  children,
}: {
  title: string
  effectiveDate: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-cream">
      <PageHeader title={title} fallbackHref="/" />
      <article className="mx-auto w-full max-w-[430px] flex-1 space-y-7 px-5 pb-16 pt-2">
        <p className="text-xs text-ink-faint">시행일: {effectiveDate}</p>
        {children}
      </article>
    </main>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
      <div className="space-y-2 text-[13.5px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  )
}

/** 번호 매긴 조항 목록 */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 marker:text-ink-faint">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ol>
  )
}
