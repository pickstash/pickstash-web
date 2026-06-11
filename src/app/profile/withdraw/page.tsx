'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteAccount } from '@/lib/api/profile'

const REASONS = [
  '앱을 잘 사용하지 않아요',
  '원하는 기능이 없어요',
  '개인정보가 걱정돼요',
  '다른 서비스를 이용해요',
]

export default function WithdrawPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [showDetail, setShowDetail] = useState(false)
  const [detail, setDetail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleReason(reason: string) {
    setSelected(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    )
  }

  function toggleDetail() {
    setShowDetail(prev => {
      if (prev) setDetail('')
      return !prev
    })
  }

  async function handleWithdraw() {
    const finalReasons = [...selected]
    const finalDetail = showDetail && detail.trim() ? detail.trim() : null
    setLoading(true)
    setError(null)
    try {
      await deleteAccount(finalReasons, finalDetail)
      router.push('/login')
    } catch {
      setError('탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.')
      setLoading(false)
    }
  }

  const canSubmit = selected.length > 0 || (showDetail && detail.trim().length > 0)

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href="/profile" className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">탈퇴하기</h1>
      </header>

      <div className="flex-1 px-5 py-6 space-y-5">
        {/* 경고 */}
        <div className="bg-red-50 rounded-2xl p-5 space-y-2">
          <p className="text-sm font-semibold text-red-600">결정창고를 정말 탈퇴하시겠어요?</p>
          <ul className="space-y-1.5 text-sm text-red-500">
            <li>• 내가 만들거나 참여한 모든 상자와 데이터가 삭제돼요.</li>
            <li>• 내가 방장인 그룹도 함께 삭제돼요.</li>
            <li>• 삭제된 데이터는 복구할 수 없어요.</li>
          </ul>
        </div>

        {/* 탈퇴 사유 */}
        <div className="bg-white rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">탈퇴하는 이유를 알려주세요</h2>
          <p className="text-xs text-gray-400">서비스 개선에 활용할게요. (복수 선택 가능)</p>

          <div className="space-y-2 pt-1">
            {REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => toggleReason(reason)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                  selected.includes(reason)
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 text-gray-700 active:bg-gray-50'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected.includes(reason) ? 'border-white' : 'border-gray-300'
                }`}>
                  {selected.includes(reason) && (
                    <span className="w-2 h-2 rounded-full bg-white block" />
                  )}
                </span>
                {reason}
              </button>
            ))}

            <button
              onClick={toggleDetail}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-colors ${
                showDetail
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 text-gray-700 active:bg-gray-50'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                showDetail ? 'border-white' : 'border-gray-300'
              }`}>
                {showDetail && <span className="w-2 h-2 rounded-full bg-white block" />}
              </span>
              직접 입력
            </button>

            {showDetail && (
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="탈퇴 사유를 입력해 주세요"
                maxLength={200}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 resize-none focus:outline-none focus:border-gray-400"
              />
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      </div>

      <div className="px-5 pb-10 space-y-3">
        <button
          onClick={handleWithdraw}
          disabled={!canSubmit || loading}
          className="w-full bg-red-500 text-white py-4 rounded-xl text-sm font-semibold disabled:opacity-40"
        >
          {loading ? '처리 중...' : '정말 탈퇴하기'}
        </button>
        <Link href="/profile">
          <button className="w-full border border-gray-200 text-gray-700 py-4 rounded-xl text-sm font-medium">
            취소
          </button>
        </Link>
      </div>
    </main>
  )
}
