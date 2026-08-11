'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { listJoinRequests, respondJoinRequest } from '@/lib/api/social'

// 참여 신청 대기 목록 — 상자 참여자에게만(RLS). 승인 시 참여자 추가(respond_join_request).
// 신청이 없으면 아무것도 렌더하지 않는다.
export function JoinRequests({ boxId }: { boxId: string }) {
  const qc = useQueryClient()
  const { data = [] } = useQuery({
    queryKey: ['join-requests', boxId],
    queryFn: () => listJoinRequests(createClient(), boxId),
  })

  async function respond(userId: string, approve: boolean) {
    // 낙관적 제거
    qc.setQueryData(['join-requests', boxId], (old: typeof data | undefined) => (old ?? []).filter(r => r.user_id !== userId))
    try {
      await respondJoinRequest(boxId, userId, approve)
    } finally {
      qc.invalidateQueries({ queryKey: ['join-requests', boxId] })
      if (approve) qc.invalidateQueries({ queryKey: ['box', boxId] })
    }
  }

  if (data.length === 0) return null

  return (
    <section className="rounded-card border border-butter-dark/40 bg-butter-tint/40 p-3.5">
      <h3 className="mb-2 text-[13px] font-extrabold text-ink">참여 신청 {data.length}</h3>
      <div className="space-y-2">
        {data.map(r => (
          <div key={r.user_id} className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-paper text-[11px] font-bold text-ink">
              {r.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                r.nickname?.[0] ?? '?'
              )}
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-ink">{r.nickname}</span>
            <button
              onClick={() => respond(r.user_id, true)}
              className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[12px] font-bold text-cream active:opacity-80"
            >
              수락
            </button>
            <button
              onClick={() => respond(r.user_id, false)}
              className="shrink-0 rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft active:bg-cream"
            >
              거절
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
