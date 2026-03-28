'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'

interface BeenThereSheetProps {
  open: boolean
  onClose: () => void
  onRate: () => void
  onRequestNew: () => void
  recoTitle: string
  senderFirstName: string
}

export function BeenThereSheet({ open, onClose, onRate, onRequestNew, recoTitle, senderFirstName }: BeenThereSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="p-[22px] pt-3">
        <div className="text-[18px] font-semibold text-white tracking-[-0.4px] mb-1">
          {recoTitle}
        </div>
        <div className="text-xs text-text-faint mb-5">
          You've already done this. What do you want to do?
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onRate}
            className="w-full py-3.5 rounded-input bg-accent text-accent-fg text-[13px] font-bold hover:opacity-90 transition-opacity"
          >
            Rate it anyway
          </button>
          <button
            onClick={onRequestNew}
            className="w-full py-3.5 rounded-input border border-border text-[13px] font-semibold text-text-secondary hover:border-text-faint transition-colors"
          >
            Ask {senderFirstName} for something new
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-[13px] text-text-faint hover:text-text-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
