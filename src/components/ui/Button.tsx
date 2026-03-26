'use client'

import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  children: React.ReactNode
}

const VARIANTS = {
  primary: 'bg-accent text-accent-fg font-bold hover:opacity-90 active:opacity-80',
  secondary: 'border border-border text-text-muted font-semibold hover:border-accent hover:text-accent',
  ghost: 'text-text-dim font-medium hover:text-text-primary',
  danger: 'bg-bad/10 border border-bad/30 text-bad font-semibold hover:bg-bad/20',
}

const SIZES = {
  sm: 'px-3 py-2 text-xs rounded-input',
  md: 'px-4 py-3 text-sm rounded-btn',
  lg: 'px-5 py-4 text-sm rounded-btn',
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
