// 댓글 답글(플랫 2단계) 그룹화 — 프레임워크·API 의존성 없는 순수 로직.

interface CommentLike {
  id: string
  parent_comment_id: string | null
}

/** 최상위 댓글과, 최상위 댓글 id별 답글 목록으로 나눈다. 입력 순서(작성 시각 오름차순)를 그대로 유지한다. */
export function groupComments<T extends CommentLike>(
  comments: T[],
): { top: T[]; repliesByParent: Record<string, T[]> } {
  const top: T[] = []
  const repliesByParent: Record<string, T[]> = {}

  for (const comment of comments) {
    if (comment.parent_comment_id) {
      ;(repliesByParent[comment.parent_comment_id] ??= []).push(comment)
    } else {
      top.push(comment)
    }
  }

  return { top, repliesByParent }
}
