'use client'

import { cn } from '@/lib/utils'

interface FilterScrollProps {
  options: { value: string; label: string }[]
  selected: string
  onSelect: (value: string) => void
  className?: string
}

export function FilterScroll({ options, selected, onSelect, className }: FilterScrollProps) {
  return (
    <div className={cn('flex gap-[7px] px-6 py-2 overflow-x-auto scrollbar-none flex-shrink-0', className)}>
      {options.map((opt) => (
        <span
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={cn(
            'text-[11px] font-medium px-3 py-1.5 border rounded-chip cursor-pointer whitespace-nowrap flex-shrink-0 transition-all',
            selected === opt.value
              ? 'border-white text-white bg-bg-elevated'
              : 'border-border text-text-dim hover:border-text-faint'
          )}
        >
          {opt.label}
        </span>
      ))}
    </div>
  )
}
