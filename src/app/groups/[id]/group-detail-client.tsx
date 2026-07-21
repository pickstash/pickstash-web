'use client'

import { useState } from 'react'
import Script from 'next/script'
import { useLeaveGroup } from '@/hooks/use-groups'
import { PageHeader } from '@/components/page-header'
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

      <main className="flex min-h-dvh flex-col">
        <PageHeader title={group.name} fallbackHref="/groups" />

        <div className="flex-1 space-y-3 px-5 pb-6 pt-1">
          <div className="rounded-card border border-[#ECEADC] bg-paper p-5">
            <p className="text-[13.5px] text-ink-soft">
              상자 정리를 같이 할 친구를 초대해보세요. (최대 30명)
            </p>
            {memberCount >= 30 && (
              <p className="mt-2 text-xs font-semibold text-tomato">멤버가 가득 찼어요. 더 이상 초대할 수 없어요.</p>
            )}
          </div>

          {/* 초대 버튼 */}
          {memberCount < 30 && (
            <div className="space-y-2">
              {process.env.NEXT_PUBLIC_KAKAO_JS_KEY && (
                <button
                  onClick={handleKakaoShare}
                  disabled={!kakaoReady}
                  className="flex w-full items-center justify-center gap-2 rounded-field bg-kakao py-4 text-sm font-bold text-kakao-ink disabled:opacity-50"
                >
                  카카오톡으로 초대
                </button>
              )}
              <button
                onClick={handleCopyLink}
                className="flex w-full items-center justify-center gap-2 rounded-field border-[1.5px] border-ink bg-paper py-4 text-sm font-bold text-ink active:bg-cream"
              >
                {copied ? '링크 복사됨!' : '초대링크 복사'}
              </button>
            </div>
          )}

          {/* 멤버 목록 */}
          <div className="rounded-card border border-[#ECEADC] bg-paper p-5">
            <p className="mb-3 text-[13.5px] font-extrabold text-ink">멤버 {memberCount}명</p>
            <div className="space-y-3">
              {group.group_members.map(m => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-butter-tint">
                    {m.profiles?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.profiles.avatar_url} alt={m.profiles.nickname} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[11px] font-bold text-ink">
                        {m.profiles?.nickname?.[0] ?? '?'}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-ink">{m.profiles?.nickname}</span>
                  {group.owner_id === m.user_id && (
                    <span className="text-[10.5px] text-ink-faint">(방장)</span>
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
              className="w-full rounded-field border border-tomato/40 py-3.5 text-sm font-semibold text-tomato active:bg-tomato-tint"
            >
              {isOwner ? '그룹 삭제하기' : '그룹 나가기'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-[13px] text-ink-soft">
                {isOwner ? '그룹을 삭제하면 모든 멤버가 나가게 됩니다.' : '정말 나가시겠어요?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="flex-1 rounded-field border border-line py-3.5 text-sm font-bold text-ink-soft"
                >
                  취소
                </button>
                <button
                  onClick={() => leaveGroup.mutate()}
                  disabled={leaveGroup.isPending}
                  className="flex-1 rounded-field bg-tomato py-3.5 text-sm font-bold text-white disabled:opacity-50"
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
