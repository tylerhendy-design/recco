import { getCategoryColor, getCategoryLabel } from '@/constants/categories'
import { cn } from '@/lib/utils'

interface CategoryDotProps {
  category: string
  showLabel?: boolean
  className?: string
}

export function CategoryDot({ category, showLabel = true, className }: CategoryDotProps) {
  const color = getCategoryColor(category)
  const label = getCategoryLabel(category)

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className="w-[7px] h-[7px] rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      {showLabel && (
        <span
          className="text-[11px] font-semibold tracking-[0.5px] uppercase"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
