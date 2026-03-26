'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface NavHeaderProps {
  title: string
  leftAction?: React.ReactNode
  rightAction?: React.ReactNode
  backHref?: string
  closeHref?: string
  className?: string
}

export function NavHeader({
  title,
  leftAction,
  rightAction,
  backHref,
  closeHref,
  className,
}: NavHeaderProps) {
  return (
    <div className={cn('flex justify-between items-center px-6 py-3.5 pb-2.5 flex-shrink-0', className)}>
      <div className="flex items-center gap-2.5">
        {backHref && (
          <Link href={backHref} className="text-xl text-text-faint cursor-pointer leading-none">
            ‹
          </Link>
        )}
        {leftAction}
        <span className="text-[22px] font-semibold text-white tracking-[-0.5px]">{title}</span>
      </div>
      <div className="flex items-center gap-2.5">
        {rightAction}
        {closeHref && (
          <Link href={closeHref} className="text-xl text-text-faint cursor-pointer p-1 leading-none">
            ✕
          </Link>
        )}
      </div>
    </div>
  )
}

// Plus circle button (used in Home and Lists nav)
export function PlusCircle({ onClick, href }: { onClick?: () => void; href?: string }) {
  const cls =
    'w-9 h-9 rounded-full border-2 border-accent flex items-center justify-center cursor-pointer flex-shrink-0 hover:bg-accent/10 transition-colors'

  const inner = (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#D4E23A" strokeWidth="2.2" strokeLinecap="round">
      <line x1="9" y1="3" x2="9" y2="15" />
      <line x1="3" y1="9" x2="15" y2="9" />
    </svg>
  )

  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    )
  }

  return (
    <div className={cls} onClick={onClick}>
      {inner}
    </div>
  )
}
