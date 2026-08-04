import type { Box } from '@/lib/api/boxes'
import { getVoteResult } from './winner'

// 홈 화면 집계 로직 — 웹(서버 컴포넌트)·토스(클라 훅)가 공유하는 프레임워크 비의존 순수 로직.
// 데이터 fetch는 각 플랫폼이 하고(서버 supabase / TanStack Query 훅), 계산은 여기 한 벌.

export type HeroParticipant = {
  user_id: string
  profiles: { avatar_url: string | null; nickname: string } | null
}

export type RawOpenBox = Box & { box_participants: HeroParticipant[] }

export interface OpenBoxCard {
  id: string
  title: string
  isNew: boolean
  isFavorite: boolean
  isSolo: boolean
  isAuto: boolean
  deadlineAt: string | null
  participants: HeroParticipant[]
  totalLikes: number
  totalComments: number
  leaders: string[] // 좋아요 1위 이름들 (0=없음, 1=단독, 2+=공동)
}

export const HOME_RAIL_LIMIT = 8 // 히어로 1개 + 레일 최대 8개까지만 좋아요 집계/표시

const deadlineTime = (b: RawOpenBox) =>
  b.decision_mode === 'auto_deadline' && b.deadline_at ? new Date(b.deadline_at).getTime() : Infinity

const isNewOf = (b: RawOpenBox, lastSeen: Map<string, string | null>) =>
  new Date(b.updated_at) > new Date(lastSeen.get(b.id) ?? 0)

/** 마감 임박(auto+deadline) → NEW → 최근 순. 좋아요 fetch 전에 표시 대상 id를 얻기 위해 분리한다. */
export function sortOpenBoxes(boxes: RawOpenBox[], lastSeen: Map<string, string | null>): RawOpenBox[] {
  return [...boxes].sort((a, b) => {
    const da = deadlineTime(a)
    const db = deadlineTime(b)
    if (da !== db) return da - db
    const na = isNewOf(a, lastSeen)
    const nb = isNewOf(b, lastSeen)
    if (na !== nb) return na ? -1 : 1
    return 0 // 쿼리의 updated_at desc 유지
  })
}

/** 표시 대상 상자 + 좋아요 원천 데이터 → 히어로/레일 카드. */
export function buildHomeCards(
  displayed: RawOpenBox[],
  ctx: {
    lastSeen: Map<string, string | null>
    favorites: Set<string>
    options: { id: string; box_id: string; name: string }[]
    votes: { option_id: string; vote_type: string }[]
    comments: { option_id: string }[]
  },
): { hero: OpenBoxCard | null; railCards: OpenBoxCard[] } {
  const likePerOption = new Map<string, number>()
  for (const v of ctx.votes) {
    if (v.vote_type === 'like') likePerOption.set(v.option_id, (likePerOption.get(v.option_id) ?? 0) + 1)
  }
  const perBox = new Map<string, { name: string; like: number }[]>()
  for (const o of ctx.options) {
    const arr = perBox.get(o.box_id) ?? []
    arr.push({ name: o.name, like: likePerOption.get(o.id) ?? 0 })
    perBox.set(o.box_id, arr)
  }
  const likeByBox = new Map<string, { total: number; leaders: string[] }>()
  for (const [boxId, summaries] of perBox) {
    const total = summaries.reduce((s, o) => s + o.like, 0)
    const r = getVoteResult(summaries)
    likeByBox.set(boxId, { total, leaders: r.winner ? [r.winner] : r.coLeaders })
  }

  // 박스별 댓글 수 — 댓글은 option_id 기준이라 박스의 선택지들에 달린 댓글을 합산.
  const optionToBox = new Map(ctx.options.map(o => [o.id, o.box_id]))
  const commentsByBox = new Map<string, number>()
  for (const c of ctx.comments) {
    const boxId = optionToBox.get(c.option_id)
    if (boxId) commentsByBox.set(boxId, (commentsByBox.get(boxId) ?? 0) + 1)
  }

  const toCard = (box: RawOpenBox): OpenBoxCard => {
    const like = likeByBox.get(box.id)
    return {
      id: box.id,
      title: box.title,
      isNew: isNewOf(box, ctx.lastSeen),
      isFavorite: ctx.favorites.has(box.id),
      isSolo: box.box_participants.length <= 1,
      isAuto: box.decision_mode === 'auto_deadline',
      deadlineAt: box.deadline_at,
      participants: box.box_participants,
      totalLikes: like?.total ?? 0,
      totalComments: commentsByBox.get(box.id) ?? 0,
      leaders: like?.leaders ?? [],
    }
  }

  const cards = displayed.map(toCard)
  return { hero: cards[0] ?? null, railCards: cards.slice(1) }
}
