'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'
import { useMyGroups, useInviteGroupToBox } from '@/hooks/use-groups'

interface InviteClientProps {
  boxId: string
  boxTitle: string
  inviteUrl: string
}

export function InviteClient({ boxId, boxTitle, inviteUrl }: InviteClientProps) {
  const [copied, setCopied] = useState(false)
  const [kakaoReady, setKakaoReady] = useState(false)
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const { data: groups = [] } = useMyGroups()
  const inviteGroup = useInviteGroupToBox(boxId)

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (window.Kakao?.isInitialized()) setKakaoReady(true)
  }, [])

  function handleKakaoShare() {
    if (!kakaoReady) return
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: boxTitle,
        description: '투표하러 가기',
        link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl },
      },
      buttons: [{ title: '투표하러 가기', link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl } }],
    })
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = inviteUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleGroupInvite() {
    if (!selectedGroupId) return
    inviteGroup.mutate(selectedGroupId, {
      onSuccess: () => {
        setInviteSuccess(true)
        setTimeout(() => {
          setGroupSheetOpen(false)
          setInviteSuccess(false)
          setSelectedGroupId(null)
          setSearch('')
        }, 1000)
      },
    })
  }

  return (
    <>
      {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
          crossOrigin="anonymous"
          onLoad={() => {
            const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
            if (key && window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key)
            setKakaoReady(true)
          }}
        />
      )}

      <div className="space-y-3">
        {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
          <button
            onClick={handleKakaoShare}
            disabled={!kakaoReady}
            className="w-full flex items-center justify-center gap-2 bg-[#FEE500] text-[#3C1E1E] py-4 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 11c0 2.989 1.657 5.616 4.153 7.179-.179.63-.644 2.268-.739 2.619-.118.432.158.427.332.311.136-.091 2.158-1.469 3.032-2.063A11.3 11.3 0 0 0 12 19c5.523 0 10-3.477 10-8s-4.477-8-10-8z"/>
            </svg>
            카카오톡으로 초대
          </button>
        )}

        <button
          onClick={handleCopyLink}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 py-4 rounded-xl text-sm font-semibold active:bg-gray-50"
        >
          {copied ? '링크 복사됨!' : '초대링크 복사'}
        </button>

        <button
          onClick={() => setGroupSheetOpen(true)}
          className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 py-4 rounded-xl text-sm font-semibold active:bg-gray-50"
        >
          그룹으로 초대
        </button>
      </div>

      {/* 그룹 검색 바텀시트 */}
      {groupSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setGroupSheetOpen(false)} />
          <div className="relative bg-white rounded-t-2xl px-5 pt-5 pb-10 space-y-4 max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">그룹으로 초대</h3>
              <button onClick={() => setGroupSheetOpen(false)} className="text-gray-400 p-1">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="그룹 이름 검색"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
            />

            <div className="overflow-y-auto flex-1 space-y-2">
              {filteredGroups.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">그룹이 없어요.</p>
              ) : (
                filteredGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id === selectedGroupId ? null : group.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${
                      selectedGroupId === group.id
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-100 bg-white'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900">{group.name}</p>
                      <p className="text-xs text-gray-400">멤버 {group.group_members.length}명</p>
                    </div>
                    {selectedGroupId === group.id && (
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            <button
              onClick={handleGroupInvite}
              disabled={!selectedGroupId || inviteGroup.isPending}
              className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {inviteSuccess ? '초대 완료!' : inviteGroup.isPending ? '초대 중...' : '초대하기'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
