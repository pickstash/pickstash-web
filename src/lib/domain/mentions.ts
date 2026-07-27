// 댓글 @멘션 — 프레임워크·API 의존성 없는 순수 로직.
// 닉네임은 유니크하지 않아 텍스트만으론 대상을 특정할 수 없으므로,
// 저장 시 본문에 `@[닉네임](userId)` 토큰을 인라인으로 심어 id 기준으로 다룬다.

export type MentionSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; userId: string; nickname: string }

const MENTION_TOKEN = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/g

/** 멘션 토큰을 렌더링용 텍스트/멘션 세그먼트로 분리한다. */
export function parseMentionBody(body: string): MentionSegment[] {
  const segments: MentionSegment[] = []
  let lastIndex = 0
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const index = match.index ?? 0
    if (index > lastIndex) segments.push({ type: 'text', value: body.slice(lastIndex, index) })
    segments.push({ type: 'mention', nickname: match[1], userId: match[2] })
    lastIndex = index + match[0].length
  }
  if (lastIndex < body.length) segments.push({ type: 'text', value: body.slice(lastIndex) })
  return segments
}

/** 본문에 멘션된 user id 목록(중복 제거). 타겟 푸시 발송용. */
export function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>()
  for (const match of body.matchAll(MENTION_TOKEN)) ids.add(match[2])
  return [...ids]
}

/** 멘션 토큰을 만든다. 댓글 입력창에서 참여자를 선택해 커밋할 때 사용. */
export function mentionToken(nickname: string, userId: string): string {
  return `@[${nickname}](${userId})`
}
