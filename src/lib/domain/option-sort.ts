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

/** 그룹핑에 필요한 최소 선택지 형태 */
interface GroupableOption {
  id: string
  created_at: string
  group_label?: string | null
}

/**
 * 체크형 상자의 아이템(=선택지)을 그룹(라벨)별로 묶어 정렬한다. 원본 배열은 변형하지 않는다.
 * 그룹은 첫 등장 순서로 나열되고, 그룹 안/그룹 없는 항목은 등록순(오래된 순)이다.
 * group_label이 없거나 빈 문자열이면 그룹 없음으로 취급해 맨 뒤에 붙인다(§033).
 */
export function groupOptions<T extends GroupableOption>(options: T[]): T[] {
  const byCreated = (a: T, b: T) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  const groupOrder: string[] = []
  const byGroup = new Map<string, T[]>()
  const ungrouped: T[] = []
  for (const o of options) {
    const label = o.group_label?.trim()
    if (!label) {
      ungrouped.push(o)
      continue
    }
    if (!byGroup.has(label)) {
      byGroup.set(label, [])
      groupOrder.push(label)
    }
    byGroup.get(label)!.push(o)
  }
  const grouped = groupOrder.flatMap(label => [...byGroup.get(label)!].sort(byCreated))
  return [...grouped, ...[...ungrouped].sort(byCreated)]
}
