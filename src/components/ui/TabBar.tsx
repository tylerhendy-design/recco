'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const TABS = [
  {
    href: '/home',
    label: 'Home',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={active ? '#D4E23A' : '#6e6e78'}>
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      </svg>
    ),
  },
  {
    href: '/send',
    label: 'Give',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={active ? '#D4E23A' : '#6e6e78'}>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ),
  },
  {
    href: '/get',
    label: 'Get',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={active ? '#D4E23A' : '#6e6e78'}>
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    ),
  },
  {
    href: '/lists',
    label: 'Places',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={active ? '#D4E23A' : '#6e6e78'}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    href: '/friends',
    label: 'Friends',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={active ? '#D4E23A' : '#6e6e78'}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    href: '/sinbin',
    label: 'Sin Bin',
    icon: (active: boolean) => {
      const c = active ? '#D4E23A' : '#6e6e78'
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
          {/* Bin body */}
          <path d="M5 8h14l-1.5 11a1 1 0 01-1 .9H7.5a1 1 0 01-1-.9L5 8z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" />
          {/* Bin lid */}
          <path d="M3 8h18M9 8V5.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V8" stroke={c} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          {/* 666 text inside bin */}
          <text x="12" y="16.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fontFamily="monospace" fill={c} letterSpacing="-0.5">666</text>
        </svg>
      )
    },
  },
]

export function TabBar() {
  const pathname = usePathname()
  const [pendingRequests, setPendingRequests] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { count } = await supabase
        .from('friend_connections')
        .select('*', { count: 'exact', head: true })
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
      setPendingRequests(count ?? 0)

      // Live updates
      supabase
        .channel('pending-requests')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'friend_connections',
          filter: `addressee_id=eq.${user.id}`,
        }, async () => {
          const { count: updated } = await supabase
            .from('friend_connections')
            .select('*', { count: 'exact', head: true })
            .eq('addressee_id', user.id)
            .eq('status', 'pending')
          setPendingRequests(updated ?? 0)
        })
        .subscribe()
    })
  }, [])

  return (
    <div className="flex px-0.5 pb-5 pt-2 border-t border-border/50 bg-bg-base flex-shrink-0">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        const showBadge = tab.href === '/friends' && pendingRequests > 0
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center gap-[3px] cursor-pointer py-1.5 rounded-xl transition-colors duration-150"
          >
            <div className="relative">
              {tab.icon(isActive)}
              {showBadge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
              )}
            </div>
            <span
              className="text-[9px] font-medium tracking-[0.1px]"
              style={{ color: isActive ? '#D4E23A' : '#6e6e78' }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
