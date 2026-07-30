'use client'

import { useState } from 'react'
import { useNav, AppLink } from '@/lib/nav/nav'
import { deleteAccount } from '@/lib/api/profile'
import { PageHeader } from '@/components/page-header'

const REASONS = [
  '앱을 잘 사용하지 않아요',
  '원하는 기능이 없어요',
  '개인정보가 걱정돼요',
  '다른 서비스를 이용해요',
]

export default function WithdrawPage() {
  const nav = useNav()
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
      nav.replace('/login') // 탈퇴 후 앱으로 back하면 인증가드 리다이렉트 → 교체
    } catch {
      setError('탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.')
      setLoading(false)
    }
  }

  const canSubmit = selected.length > 0 || (showDetail && detail.trim().length > 0)

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="탈퇴하기" fallbackHref="/profile" />

      <div className="flex-1 space-y-4 px-5 pb-6 pt-1">
        {/* 경고 */}
        <div className="space-y-2 rounded-card bg-tomato-tint p-5">
          <p className="text-sm font-extrabold text-[#B4482F]">결정창고를 정말 탈퇴하시겠어요?</p>
          <ul className="space-y-1.5 text-[13px] text-[#B4482F]">
            <li>• 내가 만들거나 참여한 모든 상자와 데이터가 삭제돼요.</li>
            <li>• 내가 방장인 그룹도 함께 삭제돼요.</li>
            <li>• 삭제된 데이터는 복구할 수 없어요.</li>
          </ul>
        </div>

        {/* 탈퇴 사유 */}
        <div className="space-y-3 rounded-card border border-[#ECEADC] bg-paper p-5">
          <h2 className="text-[13.5px] font-extrabold text-ink">탈퇴하는 이유를 알려주세요</h2>
          <p className="text-xs text-ink-faint">서비스 개선에 활용할게요. (복수 선택 가능)</p>

          <div className="space-y-2 pt-1">
            {REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => toggleReason(reason)}
                className={`flex w-full items-center gap-3 rounded-field border-[1.5px] px-4 py-3 text-left text-sm transition-colors ${
                  selected.includes(reason)
                    ? 'border-ink bg-ink text-cream'
                    : 'border-line text-ink active:bg-cream'
                }`}
              >
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected.includes(reason) ? 'border-cream' : 'border-[#C9C7B6]'
                }`}>
                  {selected.includes(reason) && (
                    <span className="block h-2 w-2 rounded-full bg-cream" />
                  )}
                </span>
                {reason}
              </button>
            ))}

            <button
              onClick={toggleDetail}
              className={`flex w-full items-center gap-3 rounded-field border-[1.5px] px-4 py-3 text-left text-sm transition-colors ${
                showDetail
                  ? 'border-ink bg-ink text-cream'
                  : 'border-line text-ink active:bg-cream'
              }`}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                showDetail ? 'border-cream' : 'border-[#C9C7B6]'
              }`}>
                {showDetail && <span className="block h-2 w-2 rounded-full bg-cream" />}
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
                className="w-full resize-none rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
              />
            )}
          </div>
        </div>

        {error && <p className="text-center text-sm text-tomato">{error}</p>}
      </div>

      <div className="space-y-3 px-5 pb-10">
        <button
          onClick={handleWithdraw}
          disabled={!canSubmit || loading}
          className="w-full rounded-field bg-tomato py-4 text-sm font-bold text-white disabled:opacity-40"
        >
          {loading ? '처리 중...' : '정말 탈퇴하기'}
        </button>
        <AppLink href="/profile" className="block">
          <button className="w-full rounded-field border border-line py-4 text-sm font-bold text-ink-soft">
            취소
          </button>
        </AppLink>
      </div>
    </main>
  )
}
