'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { AppLink } from '@/lib/nav/nav'
import { PageHeader } from '@/components/page-header'
import { AppDrawer } from '@/components/app-drawer'
import { Icon } from '@/components/icon'
import { useCreateFolder, useRenameFolder, useLeaveFolder } from '@/hooks/use-folders'

export interface FolderCard {
  id: string
  name: string
  inviteCode: string
  boxCount: number
  members: { id: string; nickname: string; avatar_url: string | null }[]
}

function MemberAvatars({ members, max = 4 }: { members: FolderCard['members']; max?: number }) {
  const shown = members.slice(0, max)
  const extra = members.length - shown.length
  return (
    <div className="flex -space-x-1.5">
      {shown.map(m => (
        <div key={m.id} className="flex h-[22px] w-[22px] items-center justify-center overflow-hidden rounded-full border-[1.5px] border-paper bg-butter-tint text-[9px] font-bold text-ink">
          {m.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            m.nickname?.[0] ?? '?'
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-full border-[1.5px] border-paper bg-cream text-[9px] font-extrabold text-ink-soft">
          +{extra}
        </div>
      )}
    </div>
  )
}

type Me = { id: string; nickname: string; avatar_url: string | null }

export function FoldersClient({ initialFolders, nickname, me }: { initialFolders: FolderCard[]; nickname: string; me: Me }) {
  const [folders, setFolders] = useState(initialFolders)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [menuFor, setMenuFor] = useState<FolderCard | null>(null)
  const [renameFor, setRenameFor] = useState<FolderCard | null>(null)
  const [renameInput, setRenameInput] = useState('')
  const [leaveFor, setLeaveFor] = useState<FolderCard | null>(null)
  const [alsoLeaveBoxes, setAlsoLeaveBoxes] = useState(false)
  const [copied, setCopied] = useState(false)

  const createFolder = useCreateFolder()
  const rename = useRenameFolder()
  const leave = useLeaveFolder()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n || createFolder.isPending) return
    createFolder.mutate(n, {
      onSuccess: (folder) => {
        setFolders(prev => [
          { id: folder.id, name: folder.name, inviteCode: folder.invite_code, boxCount: 0, members: [me] },
          ...prev,
        ])
        setName('')
        setAdding(false)
      },
    })
  }

  async function copyLink(f: FolderCard) {
    const url = `${window.location.origin}/folder-invite/${f.inviteCode}`
    try { await navigator.clipboard.writeText(url) } catch { /* 무시 */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  function doRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renameFor) return
    const n = renameInput.trim()
    if (!n || rename.isPending) return
    rename.mutate({ id: renameFor.id, name: n }, {
      onSuccess: () => {
        setFolders(prev => prev.map(f => f.id === renameFor.id ? { ...f, name: n } : f))
        setRenameFor(null)
      },
    })
  }

  function doLeave() {
    if (!leaveFor) return
    const id = leaveFor.id
    leave.mutate({ folderId: id, leaveBoxes: alsoLeaveBoxes }, {
      onSuccess: () => {
        setFolders(prev => prev.filter(f => f.id !== id))
        setLeaveFor(null)
      },
    })
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader
        title="서랍"
        right={<AppDrawer nickname={nickname} />}
      />

      <p className="px-5 pb-3 text-[13px] leading-relaxed text-ink-soft">
        주제로 상자를 묶고, 링크로 함께 정리할 사람을 초대해요.
      </p>

      <div className="grid flex-1 grid-cols-2 content-start gap-2.5 px-5 pb-28">
        {folders.length === 0 ? (
          <div className="col-span-2 rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-butter-tint text-ink">
              <Icon name="folder" size={20} />
            </span>
            <p className="text-[13.5px] font-bold text-ink">아직 서랍이 없어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">여행·집들이처럼 주제로 상자를 묶어보세요.</p>
          </div>
        ) : (
          folders.map(f => {
            const isShared = f.members.length > 1
            return (
              <div key={f.id} className="relative">
                <AppLink
                  href={`/folder/${f.id}`}
                  className="flex flex-col rounded-[18px] border border-butter-dark/25 bg-butter-tint/50 p-4 active:bg-butter-tint"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink-soft">
                    <Icon name="folder" size={18} />
                  </span>
                  <h3 className="mt-2.5 line-clamp-2 min-h-[2.5em] pr-6 text-[15px] font-extrabold leading-tight tracking-tight text-ink">{f.name}</h3>
                  <div className="mt-2 space-y-1 text-[12px] font-semibold text-ink-soft">
                    <div className="tabular-nums">상자 {f.boxCount}개</div>
                    {isShared ? (
                      <div className="flex items-center gap-1.5">
                        <MemberAvatars members={f.members} max={3} />
                        <span>{f.members.length}명</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Icon name="folder" size={12} />
                        혼자 쓰는 서랍
                      </div>
                    )}
                  </div>
                </AppLink>
                <button
                  onClick={() => setMenuFor(f)}
                  aria-label="서랍 메뉴"
                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full text-ink-faint active:bg-paper active:text-ink"
                >
                  <Icon name="more" size={18} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* 하단 고정 CTA — 헤더 대신(토스 시스템 버튼 겹침 회피). 토스는 --app-nav-h만큼 탭바 위로. */}
      <div className="fixed inset-x-0 bottom-[var(--app-nav-h,0px)] z-20 bg-cream px-5 pt-3 pb-[calc(var(--app-cta-safe,env(safe-area-inset-bottom))+0.75rem)] xl:inset-x-auto xl:bottom-10 xl:left-1/2 xl:w-[430px] xl:-translate-x-1/2 xl:rounded-b-[30px]">
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
        >
          <Icon name="plus" size={16} strokeWidth={2.4} />
          새 서랍
        </button>
      </div>

      {/* 새 서랍 만들기 바텀시트 */}
      {adding && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => { setAdding(false); setName('') }} />
          <form onSubmit={handleCreate} className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <p className="mb-3 px-1 text-[15px] font-extrabold text-ink">새 서랍 만들기</p>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="서랍 이름 (예: 여행)"
              maxLength={20}
              className="w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
            />
            <button type="submit" disabled={!name.trim() || createFolder.isPending} className="mt-3 w-full rounded-field bg-ink py-3.5 text-sm font-bold text-cream disabled:opacity-50">만들기</button>
          </form>
        </div>,
        document.body,
      )}

      {/* 서랍 액션 바텀시트 */}
      {menuFor && createPortal(
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setMenuFor(null)} />
          <div className="relative mx-auto w-full max-w-[430px] rounded-t-sheet bg-paper px-5 pb-10 pt-3">
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line" />
            <p className="mb-3 truncate px-1 text-[14px] font-extrabold text-ink">{menuFor.name}</p>
            <div className="space-y-1">
              <button
                onClick={() => { setRenameInput(menuFor.name); setRenameFor(menuFor); setMenuFor(null) }}
                className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-3 text-left text-sm font-semibold text-ink active:bg-cream"
              >
                <Icon name="edit" size={16} className="text-ink-soft" /> 이름 변경
              </button>
              <button
                onClick={() => { copyLink(menuFor); setMenuFor(null) }}
                className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-3 text-left text-sm font-semibold text-ink active:bg-cream"
              >
                <Icon name="share" size={16} className="text-ink-soft" /> 공유 링크 복사
              </button>
              <button
                onClick={() => { setAlsoLeaveBoxes(false); setLeaveFor(menuFor); setMenuFor(null) }}
                className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-3 text-left text-sm font-semibold text-tomato active:bg-tomato-tint"
              >
                <Icon name="trash" size={16} /> {menuFor.members.length > 1 ? '서랍 나가기' : '서랍 삭제'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* 이름 변경 */}
      {renameFor && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setRenameFor(null)} />
          <form onSubmit={doRename} className="relative w-full max-w-[300px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="text-[15px] font-extrabold text-ink">서랍 이름 변경</p>
            {renameFor.members.length > 1 && <p className="mt-1 text-[12px] text-ink-soft">함께 쓰는 멤버 전원에게 반영돼요.</p>}
            <input
              autoFocus
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              maxLength={20}
              className="mt-3 w-full rounded-field border-[1.5px] border-line bg-paper px-3.5 py-2.5 text-sm text-ink focus:border-butter-dark focus:outline-none"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setRenameFor(null)} className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft">취소</button>
              <button type="submit" disabled={!renameInput.trim() || rename.isPending} className="flex-1 rounded-field bg-ink py-3 text-[13px] font-bold text-cream disabled:opacity-50">저장</button>
            </div>
          </form>
        </div>,
        document.body,
      )}

      {/* 나가기/삭제 확인 */}
      {leaveFor && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-8">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setLeaveFor(null)} />
          <div className="relative w-full max-w-[320px] rounded-[20px] bg-paper p-5 shadow-[0_16px_40px_rgba(42,42,39,0.25)]">
            <p className="text-[15px] font-extrabold text-ink">
              {leaveFor.members.length > 1 ? '서랍에서 나갈까요?' : '서랍을 삭제할까요?'}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">
              {leaveFor.members.length > 1
                ? '나만 이 서랍에서 빠지고, 남은 멤버는 그대로 함께 써요.'
                : '서랍만 사라지고 담긴 상자는 그대로 남아요.'}
            </p>
            {leaveFor.boxCount > 0 && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-field bg-cream px-3 py-2.5">
                <input type="checkbox" checked={alsoLeaveBoxes} onChange={e => setAlsoLeaveBoxes(e.target.checked)} className="mt-0.5 h-[17px] w-[17px] rounded accent-ink" />
                <span className="text-[12.5px] leading-relaxed text-ink-soft">
                  이 서랍의 상자 <b className="text-ink">{leaveFor.boxCount}개</b>에서도 나가기
                  <br /><span className="text-[11px] text-ink-faint">(다른 서랍에도 든 상자는 유지돼요)</span>
                </span>
              </label>
            )}
            <div className="mt-4 flex gap-2">
              <button onClick={() => setLeaveFor(null)} className="flex-1 rounded-field border border-line py-3 text-[13px] font-bold text-ink-soft">취소</button>
              <button onClick={doLeave} disabled={leave.isPending} className="flex-1 rounded-field bg-tomato py-3 text-[13px] font-bold text-white disabled:opacity-50">
                {leaveFor.members.length > 1 ? '나가기' : '삭제하기'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* 링크 복사 토스트 */}
      {copied && createPortal(
        <div className="fixed inset-x-0 bottom-10 z-[70] flex justify-center px-8">
          <span className="rounded-full bg-ink px-4 py-2 text-[12.5px] font-bold text-cream shadow-lg">공유 링크 복사됨!</span>
        </div>,
        document.body,
      )}
    </main>
  )
}
