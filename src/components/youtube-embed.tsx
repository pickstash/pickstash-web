'use client'

import { useState } from 'react'
import { youTubeEmbedUrl, youTubeThumb } from '@/lib/domain/option-content'

/** 유튜브 파사드: 썸네일 카드 → 탭하면 인라인 플레이어로 전환(초기 로드 가벼움). */
export function YouTubeEmbed({ videoId }: { videoId: string }) {
  const [play, setPlay] = useState(false)

  if (play) {
    return (
      <div className="overflow-hidden rounded-[14px] border border-line">
        <iframe
          src={`${youTubeEmbedUrl(videoId)}?autoplay=1`}
          title="유튜브 영상"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setPlay(true)}
      aria-label="영상 재생"
      className="relative block w-full overflow-hidden rounded-[14px] border border-line"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={youTubeThumb(videoId)} alt="유튜브 영상 미리보기" className="aspect-video w-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center bg-ink/10">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-tomato text-lg text-white">▶</span>
      </span>
    </button>
  )
}
