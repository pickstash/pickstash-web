'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/api/auth'

interface AppDrawerProps {
  nickname: string
}

export function AppDrawer({ nickname }: AppDrawerProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="p-1 text-gray-500" aria-label="메뉴">
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative ml-auto w-72 h-full bg-white flex flex-col shadow-xl">
            <div className="px-5 pt-12 pb-5 border-b border-gray-100">
              <p className="text-sm text-gray-400">안녕하세요</p>
              <p className="text-base font-bold text-gray-900 mt-0.5">{nickname}님</p>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1">
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">결정창고</p>
              {[
                { href: '/messy', label: '어질러진 창고' },
                { href: '/done', label: '정리된 창고' },
                { href: '/favorites', label: '즐겨찾는 창고' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  {label}
                </Link>
              ))}

              <div className="pt-3">
                <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wide">마이페이지</p>
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  프로필 관리
                </Link>
                <Link
                  href="/groups"
                  onClick={() => setOpen(false)}
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                >
                  그룹 관리
                </Link>
              </div>
            </nav>

            <div className="px-5 pb-10 border-t border-gray-100 pt-4">
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 active:bg-red-100"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
