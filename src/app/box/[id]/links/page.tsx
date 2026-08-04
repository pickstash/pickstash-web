'use client'

import { use, useState } from 'react'
import { AppLink } from '@/lib/nav/nav'
import { PageHeader } from '@/components/page-header'
import { useOptions } from '@/hooks/use-options'
import {
  parseBlocks,
  linkBlocksOf,
  linkKindOf,
  linkKindEmoji,
  linkFallbackTitle,
  linkHref,
  LINK_KINDS,
  type LinkKind,
} from '@/lib/domain/option-content'
import { proxiedImageUrl } from '@/lib/api/unfurl'
import { Spinner } from '@/components/spinner'

export default function BoxLinksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: boxId } = use(params)
  const { data: options = [], isLoading } = useOptions(boxId)
  const [filter, setFilter] = useState<LinkKind | 'all'>('all')

  const links = options.flatMap(o =>
    linkBlocksOf(parseBlocks(o.content)).map(block => ({
      optionId: o.id,
      optionName: o.name,
      block,
      kind: linkKindOf(block),
    })),
  )
  const kindsPresent = new Set(links.map(l => l.kind))
  const shown = filter === 'all' ? links : links.filter(l => l.kind === filter)

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="링크 모아보기" fallbackHref={`/box/${boxId}`} />

      <div className="flex-1 space-y-3 px-5 pb-10 pt-1">
        {links.length > 1 && kindsPresent.size > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
                filter === 'all' ? 'border-butter-dark bg-butter-tint text-ink' : 'border-line bg-paper text-ink-soft'
              }`}
            >
              전체 {links.length}
            </button>
            {LINK_KINDS.filter(k => kindsPresent.has(k.kind)).map(k => (
              <button
                key={k.kind}
                type="button"
                onClick={() => setFilter(k.kind)}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-bold ${
                  filter === k.kind ? 'border-butter-dark bg-butter-tint text-ink' : 'border-line bg-paper text-ink-soft'
                }`}
              >
                <span>{k.emoji}</span>
                {k.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <Spinner className="py-10" />
        ) : shown.length === 0 ? (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-12 text-center">
            <p className="text-[13px] font-bold text-ink">아직 담긴 링크가 없어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">선택지에 링크를 추가하면 여기 한곳에 모여요.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shown.map(({ optionId, optionName, block, kind }) => (
              <div key={`${optionId}-${block.id}`} className="rounded-card border border-line bg-paper p-3.5">
                <a href={linkHref(block.url)} target="_blank" rel="noopener noreferrer" className="flex gap-3">
                  {block.image ? (
                    <div className="relative h-12 w-12 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proxiedImageUrl(block.image)} alt="" className="h-12 w-12 rounded-[10px] border border-line object-cover" />
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-line bg-paper text-[11px]">
                        {linkKindEmoji(kind)}
                      </span>
                    </div>
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-line bg-cream text-xl">
                      {linkKindEmoji(kind)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink">
                      {block.title || linkFallbackTitle(block.url)}
                    </p>
                    <p className="truncate text-[11px] text-ink-faint">{block.url}</p>
                  </div>
                </a>
                {block.label && (
                  <p className="mt-2 border-t border-dashed border-line pt-2 text-[13px] text-ink-soft">
                    📝 {block.label}
                  </p>
                )}
                <AppLink
                  href={`/box/${boxId}/option/${optionId}`}
                  className="mt-1.5 inline-block text-[11px] font-semibold text-ink-soft active:text-ink"
                >
                  선택지 · {optionName}
                </AppLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
