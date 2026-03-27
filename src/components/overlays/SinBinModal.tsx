'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { releaseSinBin } from '@/lib/data/sinbin'
import { getCategoryLabel } from '@/constants/categories'

interface SinBinModalProps {
  open: boolean
  onClose: () => void
  senderId: string       // the person who got sin-binned
  senderName: string
  recipientId: string    // current user (the rater)
  category: string
  offences: string[]
}

export function SinBinModal({
  open,
  onClose,
  senderId,
  senderName,
  recipientId,
  category,
  offences,
}: SinBinModalProps) {
  const [releasing, setReleasing] = useState(false)
  const firstName = senderName.split(' ')[0]
  const catLabel = getCategoryLabel(category).toLowerCase()

  async function handleRelease() {
    setReleasing(true)
    await releaseSinBin(senderId, recipientId, category)
    setReleasing(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="p-6 pt-4 flex flex-col gap-5">

        {/* Header */}
        <div>
          <div className="text-[11px] font-semibold text-bad tracking-[0.8px] uppercase mb-2">Sin bin</div>
          <div className="text-[20px] font-bold text-white tracking-[-0.4px] leading-[1.2]">
            {firstName} is in the sin bin.
          </div>
          <div className="text-[14px] text-text-muted mt-2 leading-[1.6]">
            They gave you {SCORE_THRESHOLD} bad {catLabel} recos. They can no longer send you{' '}
            {catLabel} recos until you let them out.
          </div>
        </div>

        {/* Offences */}
        {offences.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">
              The offences
            </div>
            <div className="flex flex-col gap-1.5">
              {offences.map((title, i) => (
                <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-bg-card rounded-input border border-border">
                  <div className="w-1.5 h-1.5 rounded-full bg-bad flex-shrink-0" />
                  <span className="text-[13px] text-white">{title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleRelease}
            disabled={releasing}
            className="w-full py-3.5 border border-border rounded-btn text-[14px] font-semibold text-text-secondary hover:border-text-faint transition-colors disabled:opacity-40"
          >
            {releasing ? 'Releasing…' : `Let ${firstName} out`}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-bad/10 border border-bad/30 rounded-btn text-[14px] font-bold text-bad hover:bg-bad/20 transition-colors"
          >
            Keep in sin bin
          </button>
        </div>

      </div>
    </BottomSheet>
  )
}

const SCORE_THRESHOLD = 3
