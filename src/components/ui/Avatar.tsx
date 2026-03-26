'use client'

import { cn, initials } from '@/lib/utils'

interface AvatarProps {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: string
  bgColor?: string
  className?: string
}

const SIZE_CLASSES = {
  sm: 'w-[30px] h-[30px] text-[9px]',
  md: 'w-[38px] h-[38px] text-[11px]',
  lg: 'w-[48px] h-[48px] text-[13px]',
  xl: 'w-[56px] h-[56px] text-[18px]',
}

export function Avatar({
  name,
  imageUrl,
  size = 'md',
  color = '#888',
  bgColor = '#1e1e1e',
  className,
}: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 font-semibold',
        SIZE_CLASSES[size],
        className
      )}
      style={{ background: bgColor, color }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  )
}
