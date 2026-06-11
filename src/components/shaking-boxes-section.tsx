'use client'

import Link from 'next/link'
import { useShakingBoxes, useMarkAllSeen } from '@/hooks/use-boxes'

export function ShakingBoxesSection() {
  const { data: boxes = [] } = useShakingBoxes()
  const markAll = useMarkAllSeen()

  if (boxes.length === 0) return null

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">지금 들썩이는 상자</p>
        <button
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending}
          className="text-xs text-gray-400 active:opacity-70"
        >
          모두 확인 처리
        </button>
      </div>
      <div className="space-y-2">
        {boxes.map(box => (
          <Link key={box.id} href={`/box/${box.id}`}>
            <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center gap-2 active:bg-gray-50">
              <span className="text-xs font-bold bg-blue-500 text-white px-1.5 py-0.5 rounded-full shrink-0">N</span>
              <span className="text-sm text-gray-900 truncate">{box.title}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
