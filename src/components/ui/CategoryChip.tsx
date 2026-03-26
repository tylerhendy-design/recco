'use client'

import { cn } from '@/lib/utils'
import { CATEGORY_MAP, type CategoryId } from '@/constants/categories'

interface CategoryChipProps {
  id: CategoryId | string
  label?: string
  selected?: boolean
  dashed?: boolean
  onClick?: () => void
  className?: string
}

export function CategoryChip({
  id,
  label,
  selected = false,
  dashed = false,
  onClick,
  className,
}: CategoryChipProps) {
  const cat = CATEGORY_MAP[id as CategoryId]
  const color = cat?.color ?? '#D4E23A'
  const bgColor = cat?.bgColor ?? '#1e1e00'
  const displayLabel = label ?? cat?.label ?? id

  return (
    <span
      onClick={onClick}
      className={cn(
        'text-xs font-medium px-3 py-[7px] rounded-chip border cursor-pointer transition-all duration-150',
        dashed ? 'border-dashed' : 'border-border',
        !selected && 'text-text-dim border-border hover:border-text-dim',
        className
      )}
      style={
        selected
          ? { color, borderColor: color, background: bgColor }
          : undefined
      }
    >
      {displayLabel}
    </span>
  )
}
