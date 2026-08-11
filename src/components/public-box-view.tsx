'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useNav } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { getPublicBoxView, requestToJoin, addBookmark, removeBookmark } from '@/lib/api/social'

// 공개 상자 읽기 전용 뷰어 (탐색/프로필에서 진입). 여럿 상자는 남 신원 가려진 상태로 옴(040 익명화).
type PublicOption = {
  id: string
  name: string
  decided_at: string | null
  checked_at: string | null
  like_count: number
  comments: { id: string; body: string; nickname: string; created_at: string }[]
}
type PublicView = {
  id: string
  title: string
  memo: string | null
  mode: 'decide' | 'checklist'
  closed_at: string | null
  is_shared: boolean
  participant_count: number
  tags: string[]
  author: { handle: string | null; nickname: string; avatar_url: string | null } | null
  options: PublicOption[]
}

export function PublicBoxView({ boxId }: { boxId: string }) {
  const nav = useNav()
  const { data, isPending } = useQuery({
    queryKey: ['public-box', boxId],
    queryFn: () => getPublicBoxView(createClient(), boxId),
  })
  const [requested, setRequested] = useState(false)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  const v = data as PublicView | null

  async function join() {
    if (busy) return
    setBusy(true)
    try { await requestToJoin(boxId); setRequested(true) } catch { /* 이미 참여/신청 등 */ setRequested(true) } finally { setBusy(false) }
  }
  async function toggleSave() {
    const next = !saved
    setSaved(next)
    try { next ? await addBookmark(boxId) : await removeBookmark(boxId) } catch { setSaved(!next) }
  }

  if (isPending) return <p className="p-8 text-center text-[13px] text-ink-soft">불러오는 중…</p>
  if (!v) return <p className="p-8 text-center text-[13px] text-ink-soft">공개되지 않았거나 없는 상자예요.</p>

  return (
    <main className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-cream">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-cream/95 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur-sm">
        <button onClick={() => nav.back()} aria-label="뒤로" className="p-1 text-ink"><Icon name="back" size={22} /></button>
        <span className="text-[13px] font-bold text-ink-faint">구경 중 · 읽기 전용</span>
        <button onClick={toggleSave} aria-label="저장" className="ml-auto p-1 text-ink">
          <Icon name="bookmark" size={20} style={saved ? { fill: 'var(--color-ink)' } : undefined} />
        </button>
      </header>

      <div className="flex-1 space-y-4 px-5 pb-32 pt-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${v.mode === 'checklist' ? 'bg-leaf-tint text-[#37714A]' : 'bg-butter-tint text-ink'}`}>
              {v.mode === 'checklist' ? '체크' : '결정'}
            </span>
            <h1 className="text-[20px] font-extrabold tracking-tight text-ink">{v.title}</h1>
          </div>
          {v.author && (
            <p className="mt-1 text-[12px] text-ink-faint">
              by {v.author.handle ? `@${v.author.handle}` : v.author.nickname} · {v.participant_count}명 참여
            </p>
          )}
          {v.memo && <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">{v.memo}</p>}
          {v.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {v.tags.map(t => <span key={t} className="rounded-full bg-paper px-2 py-0.5 text-[11px] font-bold text-ink-soft">#{t}</span>)}
            </div>
          )}
        </div>

        <section className="space-y-2">
          {v.options.map(o => (
            <div key={o.id} className={`rounded-card border p-3.5 ${o.decided_at ? 'border-butter-dark bg-butter-tint/40' : 'border-[#ECEADC] bg-paper'}`}>
              <div className="flex items-center gap-1.5">
                {o.decided_at && <span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-extrabold text-cream">결정</span>}
                {v.mode === 'checklist' && o.checked_at && <Icon name="check" size={14} strokeWidth={3} />}
                <span className="text-[14.5px] font-extrabold text-ink">{o.name}</span>
                {v.mode === 'decide' && o.like_count > 0 && (
                  <span className="ml-auto flex items-center gap-1 text-[12px] font-bold text-ink-soft"><Icon name="heart" size={13} />{o.like_count}</span>
                )}
              </div>
              {o.comments?.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-line pt-2">
                  {o.comments.map(c => (
                    <p key={c.id} className="text-[12px] text-ink-soft"><span className="font-bold text-ink">{c.nickname}</span> {c.body}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </div>

      {/* 참여 신청 CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[430px] bg-cream px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        <button
          onClick={join}
          disabled={busy || requested}
          className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80 disabled:opacity-50"
        >
          {requested ? '참여 신청됨 · 승인 대기' : '함께하기 신청'}
        </button>
      </div>
    </main>
  )
}
