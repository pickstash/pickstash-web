// 프로필 소개(bio) 안 #해시태그 = 관심 분야 태그(인스타식). 프레임워크·API 의존 없는 순수 로직.
// 저장 시 extractTags로 tags 배열을 뽑아(검색 매칭용), 표시 시 splitHashtags로 조각내 하이라이트한다.
// 한글·영문·숫자·밑줄 허용(공백/문장부호에서 끊김).
const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu

// 저장용 — 소개에서 태그만 뽑아 정규화(# 제거·중복 제거·최대 8개). search_public이 이 tags로 사람을 찾는다.
export function extractTags(bio: string): string[] {
  const found = bio.match(HASHTAG_RE) ?? []
  return [...new Set(found.map(t => t.slice(1)).filter(Boolean))].slice(0, 8)
}

// 표시용 — 소개를 [일반 텍스트 | 해시태그] 조각으로. 컴포넌트가 tag 조각만 강조 렌더.
export function splitHashtags(bio: string): { text: string; tag: boolean }[] {
  const out: { text: string; tag: boolean }[] = []
  let last = 0
  for (const m of bio.matchAll(HASHTAG_RE)) {
    const i = m.index ?? 0
    if (i > last) out.push({ text: bio.slice(last, i), tag: false })
    out.push({ text: m[0], tag: true })
    last = i + m[0].length
  }
  if (last < bio.length) out.push({ text: bio.slice(last), tag: false })
  return out
}
