'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMyGroups, useCreateGroup } from '@/hooks/use-groups'
import { checkGroupNameExists } from '@/lib/api/groups'
import { PageHeader } from '@/components/page-header'

export default function GroupsPage() {
  const { data: groups = [], isLoading } = useMyGroups()
  const createGroup = useCreateGroup()

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [nameChecked, setNameChecked] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)

  async function handleCheckName() {
    if (!name.trim()) return
    setChecking(true)
    const exists = await checkGroupNameExists(name.trim())
    setNameChecked(!exists)
    setChecking(false)
  }

  function handleNameChange(v: string) {
    setName(v)
    setNameChecked(null)
  }

  function handleCreate() {
    if (!nameChecked || !name.trim()) return
    createGroup.mutate(name.trim(), { onSuccess: () => { setModalOpen(false); setName('') } })
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <PageHeader title="그룹 관리" />

      <p className="px-5 pb-4 text-[13px] leading-relaxed text-ink-soft">
        초대하고 수락하는 과정 없이, 언제나 함께 상자를 정리할 수 있는 모임이에요.
      </p>

      <div className="flex-1 space-y-2.5 px-5">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-ink-faint">불러오는 중...</p>
        ) : groups.length === 0 ? (
          <div className="rounded-card border border-dashed border-[#D9D6C2] bg-paper/60 px-6 py-14 text-center">
            <p className="text-[13.5px] font-bold text-ink">소속된 그룹이 없어요</p>
            <p className="mt-1 text-[12px] text-ink-soft">자주 함께 정하는 사람들을 그룹으로 묶어보세요!</p>
          </div>
        ) : (
          groups.map(group => (
            <Link key={group.id} href={`/groups/${group.id}`} className="block">
              <div className="flex items-center justify-between rounded-card border border-[#ECEADC] bg-paper p-4 active:bg-butter-tint/40">
                <div>
                  <p className="text-[15px] font-extrabold text-ink">{group.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-faint">멤버 {group.group_members.length}명</p>
                </div>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-[#C9C7B6]">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="px-5 pb-10 pt-4">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full rounded-field bg-ink py-4 text-sm font-bold text-cream active:opacity-80"
        >
          새로운 그룹 만들기
        </button>
      </div>

      {/* 그룹 만들기 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-sm space-y-4 rounded-card bg-paper p-6">
            <h2 className="text-base font-extrabold tracking-tight text-ink">새로운 그룹 만들기</h2>

            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="그룹 이름"
                  maxLength={30}
                  className="flex-1 rounded-field border-[1.5px] border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-butter-dark focus:outline-none"
                />
                <button
                  onClick={handleCheckName}
                  disabled={!name.trim() || checking}
                  className="shrink-0 rounded-field border-[1.5px] border-line px-4 py-3 text-sm font-bold text-ink-soft disabled:opacity-50"
                >
                  중복확인
                </button>
              </div>
              {nameChecked === true && (
                <p className="mt-1.5 text-xs font-semibold text-leaf">사용 가능한 이름이에요.</p>
              )}
              {nameChecked === false && (
                <p className="mt-1.5 text-xs font-semibold text-tomato">동일한 이름의 그룹이 존재합니다.</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setModalOpen(false); setName(''); setNameChecked(null) }}
                className="flex-1 rounded-field border border-line py-3.5 text-sm font-bold text-ink-soft"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!nameChecked || createGroup.isPending}
                className="flex-1 rounded-field bg-ink py-3.5 text-sm font-bold text-cream disabled:opacity-50"
              >
                {createGroup.isPending ? '만드는 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
