'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

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
    href: '/browse',
    label: 'Browse',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke={active ? '#D4E23A' : '#6e6e78'}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" />
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
    label: 'Lists',
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
]

export function TabBar() {
  const pathname = usePathname()

  return (
    <div className="flex px-0.5 pb-5 pt-2 border-t border-border/50 bg-bg-base flex-shrink-0">
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex-1 flex flex-col items-center gap-[3px] cursor-pointer py-1.5 rounded-xl transition-colors duration-150"
          >
            {tab.icon(isActive)}
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
