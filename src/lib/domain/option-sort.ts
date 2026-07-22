// 선택지 목록 정렬 — 프레임워크·API 의존성 없는 순수 계산 로직.

export type OptionSortMode = 'latest' | 'likes'

export const OPTION_SORT_MODES: OptionSortMode[] = ['latest', 'likes']

export const OPTION_SORT_LABELS: Record<OptionSortMode, string> = {
  latest: '최신순',
  likes: '좋아요순',
}

/** 정렬에 필요한 최소 선택지 형태 */
interface SortableOption {
  id: string
  created_at: string
}

/** 정렬에 필요한 최소 득표 형태 (VoteCount 등이 만족) */
interface LikeCount {
  like: number
}

/**
 * 선택지 목록을 정렬한다. 원본 배열은 변형하지 않는다.
 * - latest: 최신 등록순 (created_at 내림차순)
 * - likes:  좋아요 많은 순 (like 내림차순, 동점 시 최신순)
 */
export function sortOptions<T extends SortableOption>(
  options: T[],
  votes: Record<string, LikeCount>,
  mode: OptionSortMode,
): T[] {
  const byLatest = (a: T, b: T) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()

  if (mode === 'likes') {
    return [...options].sort((a, b) => {
      const la = votes[a.id]?.like ?? 0
      const lb = votes[b.id]?.like ?? 0
      if (lb !== la) return lb - la
      return byLatest(a, b)
    })
  }

  return [...options].sort(byLatest)
}
