'use client'

import { useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import { useLeaveGroup } from '@/hooks/use-groups'
import type { GroupWithMembers } from '@/lib/api/groups'

interface GroupDetailClientProps {
  group: GroupWithMembers
  currentUserId: string
  inviteUrl: string
}

export function GroupDetailClient({ group, currentUserId, inviteUrl }: GroupDetailClientProps) {
  const [copied, setCopied] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [kakaoReady, setKakaoReady] = useState(false)
  const leaveGroup = useLeaveGroup(group.id)

  const isOwner = group.owner_id === currentUserId
  const memberCount = group.group_members.length

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

  function handleKakaoShare() {
    if (!kakaoReady) return
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `${group.name} 그룹에 초대합니다`,
        description: '함께 결정을 내려요',
        link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl },
      },
      buttons: [{ title: '그룹 참여하기', link: { mobileWebUrl: inviteUrl, webUrl: inviteUrl } }],
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

      <main className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
          <Link href="/groups" className="text-gray-400">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="flex-1 text-base font-semibold text-gray-900 truncate">{group.name}</h1>
        </header>

        <div className="flex-1 px-5 py-6 space-y-4">
          <div className="bg-white rounded-2xl p-5">
            <p className="text-sm text-gray-500">
              상자 정리를 같이 할 친구를 초대해보세요. (최대 30명)
            </p>
            {memberCount >= 30 && (
              <p className="mt-2 text-xs text-red-400">멤버가 가득 찼어요. 더 이상 초대할 수 없어요.</p>
            )}
          </div>

          {/* 초대 버튼 */}
          {memberCount < 30 && (
            <div className="space-y-2">
              {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
                <button
                  onClick={handleKakaoShare}
                  disabled={!kakaoReady}
                  className="w-full flex items-center justify-center gap-2 bg-[#FEE500] text-[#3C1E1E] py-4 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  카카오톡으로 초대
                </button>
              )}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 py-4 rounded-xl text-sm font-semibold active:bg-gray-50"
              >
                {copied ? '링크 복사됨!' : '초대링크 복사'}
              </button>
            </div>
          )}

          {/* 멤버 목록 */}
          <div className="bg-white rounded-2xl p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">멤버 {memberCount}명</p>
            <div className="space-y-3">
              {group.group_members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                    {m.profiles?.avatar_url ? (
                      <img src={m.profiles.avatar_url} alt={m.profiles.nickname} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                        {m.profiles?.nickname?.[0] ?? '?'}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-gray-700">{m.profiles?.nickname}</span>
                  {group.owner_id === m.user_id && (
                    <span className="text-xs text-gray-400">(방장)</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 그룹 나가기 */}
        <div className="px-5 pb-10">
          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="w-full border border-red-200 text-red-400 py-3.5 rounded-xl text-sm font-medium"
            >
              {isOwner ? '그룹 삭제하기' : '그룹 나가기'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-sm text-gray-500">
                {isOwner ? '그룹을 삭제하면 모든 멤버가 나가게 됩니다.' : '정말 나가시겠어요?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="flex-1 border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-medium"
                >
                  취소
                </button>
                <button
                  onClick={() => leaveGroup.mutate()}
                  disabled={leaveGroup.isPending}
                  className="flex-1 bg-red-500 text-white py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                >
                  {isOwner ? '삭제하기' : '나가기'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
