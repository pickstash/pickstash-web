import { splitHashtags } from '@/lib/domain/hashtags'

// 프로필 소개 렌더 — 줄바꿈 유지(whitespace-pre-wrap). 안의 #해시태그는 검정글씨(강조 없음)로,
// 태그 자체가 관심 분야라 별도 칩은 없음.
export function BioText({ text, className }: { text: string; className?: string }) {
  if (!text) return null
  return (
    <p className={['whitespace-pre-wrap', className].filter(Boolean).join(' ')}>
      {splitHashtags(text).map((s, i) =>
        s.tag ? (
          <span key={i} className="text-ink">{s.text}</span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </p>
  )
}
