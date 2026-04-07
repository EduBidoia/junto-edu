'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  name: string
  email: string
}

export function LogoutMenu({ name, email }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu do usuário"
        aria-expanded={open}
        className={[
          'flex items-center gap-1.5 rounded-full pl-1 pr-2 py-1 transition-all duration-150',
          'ring-1 ring-transparent hover:ring-[#1D9E75]/50 hover:shadow-[0_0_0_3px_rgba(29,158,117,0.12)]',
          open ? 'ring-[#1D9E75]/60 shadow-[0_0_0_3px_rgba(29,158,117,0.15)]' : '',
        ].join(' ')}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1D9E75]/10 text-sm font-bold text-[#1D9E75]">
          {name[0].toUpperCase()}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={[
            'h-3 w-3 text-gray-400 transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
        >
          <path fillRule="evenodd" d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      <div
        className={[
          'absolute right-0 top-[calc(100%+8px)] z-20 w-52 rounded-2xl border border-gray-100 bg-white shadow-xl',
          'origin-top-right transition-all duration-150',
          open
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-1 pointer-events-none',
        ].join(' ')}
      >
        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{email}</p>
        </div>

        {/* Actions */}
        <div className="py-1">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-gray-400 shrink-0">
              <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6 10a.75.75 0 0 1 .75-.75h9.546l-1.048-.943a.75.75 0 1 1 1.004-1.114l2.5 2.25a.75.75 0 0 1 0 1.114l-2.5 2.25a.75.75 0 1 1-1.004-1.114l1.048-.943H6.75A.75.75 0 0 1 6 10Z" clipRule="evenodd" />
            </svg>
            Sair
          </button>
        </div>
      </div>
    </div>
  )
}
