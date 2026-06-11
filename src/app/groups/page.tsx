'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useMyGroups, useCreateGroup } from '@/hooks/use-groups'
import { checkGroupNameExists } from '@/lib/api/groups'

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
    <main className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link href="/" className="text-gray-400">
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-gray-900">그룹 관리</h1>
      </header>

      <p className="px-5 py-4 text-sm text-gray-400">
        초대하고 수락하는 과정 없이, 언제나 함께 상자를 정리할 수 있는 모임이에요.
      </p>

      <div className="flex-1 px-5 space-y-3">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">소속된 그룹이 없어요.</p>
        ) : (
          groups.map(group => (
            <Link key={group.id} href={`/groups/${group.id}`}>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between active:bg-gray-50">
                <div>
                  <p className="text-base font-semibold text-gray-900">{group.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">멤버 {group.group_members.length}명</p>
                </div>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
          className="w-full bg-gray-900 text-white py-4 rounded-xl text-sm font-semibold"
        >
          새로운 그룹 만들기
        </button>
      </div>

      {/* 그룹 만들기 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">새로운 그룹 만들기</h2>

            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="그룹 이름"
                  maxLength={30}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400"
                />
                <button
                  onClick={handleCheckName}
                  disabled={!name.trim() || checking}
                  className="shrink-0 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  중복확인
                </button>
              </div>
              {nameChecked === true && (
                <p className="mt-1.5 text-xs text-green-500">사용 가능한 이름이에요.</p>
              )}
              {nameChecked === false && (
                <p className="mt-1.5 text-xs text-red-400">동일한 이름의 그룹이 존재합니다.</p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setModalOpen(false); setName(''); setNameChecked(null) }}
                className="flex-1 border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!nameChecked || createGroup.isPending}
                className="flex-1 bg-gray-900 text-white py-3.5 rounded-xl text-sm font-semibold disabled:opacity-50"
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
