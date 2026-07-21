'use client'

import { useState } from 'react'
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
          onReady={() => {
            const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
            if (key && window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(key)
            setKakaoReady(true)
          }}
        />
      )}

      <div className="space-y-2.5">
        {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
          <button
            onClick={handleKakaoShare}
            disabled={!kakaoReady}
            className="flex w-full items-center justify-center gap-2 rounded-field bg-kakao py-4 text-sm font-bold text-kakao-ink disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 11c0 2.989 1.657 5.616 4.153 7.179-.179.63-.644 2.268-.739 2.619-.118.432.158.427.332.311.136-.091 2.158-1.469 3.032-2.063A11.3 11.3 0 0 0 12 19c5.523 0 10-3.477 10-8s-4.477-8-10-8z"/>
            </svg>
            카카오톡으로 초대
          </button>
        )}

        <button
          onClick={handleCopyLink}
          className="flex w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-ink bg-paper py-4 text-sm font-bold text-ink active:bg-cream"
        >
          {copied ? '링크 복사됨!' : '초대링크 복사'}
        </button>

        <button
          onClick={() => setGroupSheetOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-line bg-paper py-4 text-sm font-bold text-ink-soft active:bg-cream"
        >
          그룹으로 초대
        </button>
      </div>

      {/* 그룹 검색 바텀시트 */}
      {groupSheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setGroupSheetOpen(false)} />
          <div className="relative mx-auto flex max-h-[70vh] w-full max-w-[430px] flex-col space-y-4 rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto h-1 w-9 rounded-full bg-line" />
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold tracking-tight text-ink">그룹으로 초대</h3>
              <button onClick={() => setGroupSheetOpen(false)} className="p-1 text-ink-faint">
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
              className="w-full rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
            />

            <div className="flex-1 space-y-2 overflow-y-auto">
              {filteredGroups.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">그룹이 없어요.</p>
              ) : (
                filteredGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id === selectedGroupId ? null : group.id)}
                    className={`flex w-full items-center justify-between rounded-field border-[1.5px] p-4 transition-colors ${
                      selectedGroupId === group.id
                        ? 'border-butter-dark bg-butter-tint'
                        : 'border-line bg-paper'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold text-ink">{group.name}</p>
                      <p className="text-[11.5px] text-ink-faint">멤버 {group.group_members.length}명</p>
                    </div>
                    {selectedGroupId === group.id && (
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" className="text-ink">
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
              className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream disabled:opacity-50"
            >
              {inviteSuccess ? '초대 완료!' : inviteGroup.isPending ? '초대 중...' : '초대하기'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
