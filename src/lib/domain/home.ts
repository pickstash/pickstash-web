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
  mode: 'decide' | 'checklist' // 체크형은 좋아요/1위 대신 진행률(checked/total) 표시
  checked: number // 체크형: 체크된 항목 수 (checked_at not null)
  total: number // 전체 항목(선택지) 수 — 결정형도 포함(모드 무관하게 옵션 개수)
  isNew: boolean
  isFavorite: boolean
  isSolo: boolean
  isAuto: boolean
  deadlineAt: string | null
  participants: HeroParticipant[]
  leaders: string[] // '인기' 이름 (0=없음, 1=단독 최다+2개↑만. 동점·1개는 미표시)
}

/** 정리완료(닫힘) 상자 — 최소 정보만. 결정 결과가 있으면 winnerName, 없으면 null(마감 시 신호 없음 §3-3). */
export interface RecapCard {
  id: string
  title: string
  mode: 'decide' | 'checklist'
  winnerName: string | null
  participants: HeroParticipant[]
}

/** 홈 스트림·서랍 레일이 함께 쓰는 카드 유니언 — 열림/닫힘 섞인 목록을 한 배열로 표현. */
export type BoxCard =
  | (OpenBoxCard & { status: 'open' })
  | (RecapCard & { status: 'done' })

export interface BoxCardCtx {
  lastSeen: Map<string, string | null>
  favorites: Set<string>
  options: { id: string; box_id: string; name: string; checked_at?: string | null; decided_at?: string | null }[]
  votes: { option_id: string; vote_type: string }[]
}

/** 들썩이는 상자 항목 — 열림 상자 카드 + 최근 7일 내 '무슨 일이 있었는지' 한 줄. */
export interface ShakingItem {
  card: BoxCard // status: 'open'
  note: string // formatActivity로 만든 최신 활동 문구
}

/** 홈 브리핑 — "돌아왔을 때 놓치면 안 되는 것". 전체 상자 브라우징은 상자 탭이 전담.
 *  ① 최근에 이렇게 정했어요(7일 이내 정리완료) → ② 들썩이는 상자(7일 이내 다른 사람 활동). */
export interface HomeBrief {
  recentDone: BoxCard[] // ① 7일 이내 정리완료, 최대 5개
  shaking: ShakingItem[] // ② 7일 이내 다른 사람 활동 있는 열림 상자(열어봐도 7일간 유지)
}

export const BRIEF_WINDOW_MS = 7 * 86_400_000 // 최근 결정·들썩임 공통 유지창 7일

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

/** 상자 목록(열림+닫힘 섞여도 OK) + 선택지/투표 → 카드 목록. buildHomeCards·loadFolderView가 공유. */
export function buildBoxCards(boxes: RawOpenBox[], ctx: BoxCardCtx): BoxCard[] {
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
  const likeByBox = new Map<string, { leaders: string[] }>()
  for (const [boxId, summaries] of perBox) {
    const r = getVoteResult(summaries)
    likeByBox.set(boxId, { leaders: r.winner ? [r.winner] : r.coLeaders })
  }

  // 박스별 체크형 진행률(checked/total) — options.checked_at 기준. total은 모드 무관 옵션 개수.
  const progressByBox = new Map<string, { checked: number; total: number }>()
  for (const o of ctx.options) {
    const p = progressByBox.get(o.box_id) ?? { checked: 0, total: 0 }
    p.total++
    if (o.checked_at) p.checked++
    progressByBox.set(o.box_id, p)
  }

  // 박스별 결정 결과 — options.decided_at 기준(여러 개=공동 결정).
  const winnerByBox = new Map<string, string>()
  for (const o of ctx.options) {
    if (!o.decided_at) continue
    const names = winnerByBox.get(o.box_id)
    winnerByBox.set(o.box_id, names ? `${names}, ${o.name}` : o.name)
  }

  return boxes.map((box): BoxCard => {
    if (box.closed_at) {
      return {
        status: 'done',
        id: box.id,
        title: box.title,
        mode: box.mode === 'checklist' ? 'checklist' : 'decide',
        winnerName: winnerByBox.get(box.id) ?? null,
        participants: box.box_participants,
      }
    }
    const like = likeByBox.get(box.id)
    const prog = progressByBox.get(box.id)
    return {
      status: 'open',
      id: box.id,
      title: box.title,
      mode: box.mode === 'checklist' ? 'checklist' : 'decide',
      checked: prog?.checked ?? 0,
      total: prog?.total ?? 0,
      isNew: isNewOf(box, ctx.lastSeen),
      isFavorite: ctx.favorites.has(box.id),
      isSolo: box.box_participants.length <= 1,
      isAuto: box.decision_mode === 'auto_deadline',
      deadlineAt: box.deadline_at,
      participants: box.box_participants,
      leaders: like?.leaders ?? [],
    }
  })
}
