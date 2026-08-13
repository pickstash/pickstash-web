'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AppLink } from '@/lib/nav/nav'
import { Icon } from '@/components/icon'
import { PullToRefresh } from '@/components/pull-to-refresh'
import { ProfileBoxCard } from '@/components/profile-box-card'
import { ImageLightbox } from '@/components/image-lightbox'
import { BioText } from '@/components/bio-text'
import { getMyProfile, getMyBookmarks, setBoxPin, setBoxVisibility, type PublicBoxCard } from '@/lib/api/social'
import { shareInviteLink } from '@/lib/share/native-share'

// 내 프로필(인스타식) — 헤더 + [공개 | 저장함] 탭 + 상자 그리드. 설정은 톱니 → /profile/settings.
export function MyProfileView() {
  const [tab, setTab] = useState<'public' | 'saved'>('public')
  const queryClient = useQueryClient()
  const { data: profile, isPending } = useQuery({ queryKey: ['my-profile'], queryFn: getMyProfile })
  const { data: saved = [] } = useQuery({ queryKey: ['my-bookmarks'], queryFn: getMyBookmarks, enabled: tab === 'saved' })

  // 카드 길게누르기 → 액션 메뉴(고정/비공개/태그/공유). 태그는 하위 시트로. 성공 시 프로필 재조회.
  const [menuBox, setMenuBox] = useState<PublicBoxCard | null>(null)
  const [tagEdit, setTagEdit] = useState<PublicBoxCard | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [capError, setCapError] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['my-profile'] })
  const pinMut = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) => setBoxPin(id, pinned),
    onSuccess: invalidate,
    onError: (e: unknown) => {
      if (e instanceof Error && e.message.includes('PIN_LIMIT')) {
        setCapError(true)
        setTimeout(() => setCapError(false), 1800)
      }
    },
  })
  // 비공개 전환 + 태그 저장 공용(둘 다 set_box_visibility). 공개 탭 카드라 태그 저장 시 공개 유지(true).
  const visMut = useMutation({
    mutationFn: ({ id, isPublic, tags }: { id: string; isPublic: boolean; tags: string[] }) => setBoxVisibility(id, isPublic, tags),
    onSuccess: invalidate,
  })

  function openTagEdit(b: PublicBoxCard) {
    setTagInput(b.tags.join(', '))
    setTagEdit(b)
    setMenuBox(null)
  }
  function saveTags(e: React.FormEvent) {
    e.preventDefault()
    if (!tagEdit) return
    // box-detail 공개설정과 동일 파싱: #·공백 제거, 빈 값 제외, 최대 8개.
    const tags = tagInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 8)
    visMut.mutate({ id: tagEdit.id, isPublic: true, tags })
    setTagEdit(null)
  }

  if (isPending) return <p className="p-8 text-center text-[13px] text-ink-soft">불러오는 중…</p>
  if (!profile) return <p className="p-8 text-center text-[13px] text-ink-soft">프로필을 불러오지 못했어요.</p>

  const grid = tab === 'public' ? profile.boxes : saved

  return (
    <PullToRefresh onRefresh={() => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
      queryClient.invalidateQueries({ queryKey: ['my-bookmarks'] }),
    ])}>
    <main className="mx-auto min-h-dvh max-w-[430px] bg-cream pb-28">
      {/* 우상단은 토스 시스템 버튼 자리라 비워둔다 — 액션은 본문 안으로. */}
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-1">
        <h1 className="text-[17px] font-extrabold tracking-tight text-ink">프로필</h1>
      </header>

      <div className="px-5 pt-3">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label="프로필 사진 크게 보기"
              className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-butter-tint active:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-butter-tint text-[24px] font-extrabold text-ink">
              {profile.nickname?.[0] ?? '?'}
            </div>
          )}
          <ImageLightbox open={photoOpen} src={profile.avatar_url ?? null} onClose={() => setPhotoOpen(false)} />
          <div className="flex flex-1 justify-around text-center">
            {([['공개', profile.public_count, null], ['팔로워', profile.followers, 'followers'], ['팔로잉', profile.following, 'following']] as const).map(([k, v, tab]) => {
              const inner = (<><p className="text-[16px] font-extrabold text-ink">{v}</p><p className="text-[11px] text-ink-faint">{k}</p></>)
              return tab ? (
                <AppLink key={k} href={`/follows/${profile.id}/${tab}`} className="active:opacity-60">{inner}</AppLink>
              ) : (
                <div key={k}>{inner}</div>
              )
            })}
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-ink">{profile.nickname}</p>
            {profile.handle ? (
              <p className="text-[12px] text-ink-faint">@{profile.handle}</p>
            ) : (
              <AppLink href="/profile/settings" className="text-[12px] font-medium text-tangerine">아이디를 설정하면 프로필을 공유할 수 있어요 →</AppLink>
            )}
            {profile.bio && <BioText text={profile.bio} className="mt-1 text-[12.5px] text-ink-soft" />}
          </div>
          <AppLink
            href="/profile/settings"
            className="flex shrink-0 items-center gap-1 rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] font-bold text-ink-soft active:bg-cream"
          >
            <Icon name="edit" size={13} />
            설정
          </AppLink>
        </div>
      </div>

      {/* 탭 */}
      <div className="mt-4 flex border-b border-line px-5">
        {(['public', 'saved'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 pb-2.5 text-[13px] font-bold ${tab === t ? 'border-b-2 border-ink text-ink' : 'text-ink-faint'}`}
          >
            {t === 'public' ? '공개한 상자' : '저장한 상자'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 pt-4">
        {grid.length === 0 ? (
          <p className="col-span-2 py-12 text-center text-[13px] text-ink-faint">
            {tab === 'public' ? '아직 공개한 상자가 없어요.' : '저장한 상자가 없어요.'}
          </p>
        ) : (
          grid.map((b: PublicBoxCard) => (
            <ProfileBoxCard
              key={b.id}
              box={b}
              onLongPress={tab === 'public' ? () => setMenuBox(b) : undefined}
            />
          ))
        )}
      </div>

      {/* 상자 액션 메뉴 — 본인 공개 상자를 길게 눌렀을 때. 제목 없음(카드가 곧 맥락). */}
      {menuBox && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setMenuBox(null)} />
          <div className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-3 pb-10 pt-3">
            <div className="mx-auto mb-2 h-1 w-9 rounded-full bg-line" />
            <button
              onClick={() => { pinMut.mutate({ id: menuBox.id, pinned: !menuBox.pinned_at }); setMenuBox(null) }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[14.5px] font-bold text-ink active:bg-cream"
            >
              <Icon name="pin" size={18} />
              {menuBox.pinned_at ? '상단 고정 해제' : '상단 고정'}
            </button>
            <button
              onClick={() => { visMut.mutate({ id: menuBox.id, isPublic: false, tags: menuBox.tags }); setMenuBox(null) }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[14.5px] font-bold text-ink active:bg-cream"
            >
              <Icon name="lock" size={18} />
              비공개로 전환
            </button>
            <button
              onClick={() => openTagEdit(menuBox)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[14.5px] font-bold text-ink active:bg-cream"
            >
              <span className="w-[18px] text-center text-[17px] font-extrabold text-ink">#</span>
              태그 수정
            </button>
            <button
              onClick={() => { void shareInviteLink({ path: `/box/${menuBox.id}` }); setMenuBox(null) }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-[14.5px] font-bold text-ink active:bg-cream"
            >
              <Icon name="share" size={18} />
              공유하기
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* 태그 수정 하위 시트 — box-detail 공개설정과 동일한 저장 경로(set_box_visibility, 공개 유지). */}
      {tagEdit && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setTagEdit(null)} />
          <form onSubmit={saveTags} className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-line" />
            <label className="mb-1.5 block text-[12px] font-semibold text-ink-soft">태그 (쉼표로 구분, 최대 8개)</label>
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              autoFocus
              placeholder="점심, 회식, 강남"
              className="w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-[14px] text-ink outline-none focus:border-butter-dark"
            />
            <button
              type="submit"
              disabled={visMut.isPending}
              className="mt-3 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-cream active:opacity-90 disabled:opacity-50"
            >
              저장
            </button>
          </form>
        </div>,
        document.body,
      )}
      {capError && createPortal(
        <div className="fixed inset-x-0 bottom-24 z-[90] flex justify-center px-8">
          <span className="rounded-full bg-ink px-4 py-2 text-[12.5px] font-bold text-cream shadow-lg">상단 고정은 3개까지 가능해요</span>
        </div>,
        document.body,
      )}
    </main>
    </PullToRefresh>
  )
}
