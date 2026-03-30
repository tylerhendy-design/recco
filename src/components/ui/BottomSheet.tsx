'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

export function BottomSheet({ open, onClose, children, className }: BottomSheetProps) {
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 md:absolute md:inset-0 z-[200]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 animate-fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-bg-elevated rounded-t-sheet animate-slide-up',
          className
        )}
      >
        {/* Handle */}
        <div className="w-9 h-1 bg-border rounded-full mx-auto mt-3 mb-0" />
        {children}
      </div>
    </div>
  )
}
