'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'

interface OffendingReco {
  title: string
  score: number
}

interface SinBinSheetProps {
  open: boolean
  onClose: () => void
  onRelease: () => void
  friendName: string
  category: string
  offendingRecos?: OffendingReco[]
}

export function SinBinSheet({
  open,
  onClose,
  onRelease,
  friendName,
  category,
  offendingRecos = [],
}: SinBinSheetProps) {
  const [released, setReleased] = useState(false)
  const firstName = friendName.split(' ')[0]

  function handleRelease() {
    setReleased(true)
  }

  function handleDone() {
    setReleased(false)
    onRelease()
  }

  return (
    <BottomSheet open={open} onClose={released ? handleDone : onClose}>
      {released ? (
        /* ── Release confirmation ── */
        <div className="p-6 pt-4 text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-good/10 border border-good/30 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-[19px] font-semibold text-white tracking-[-0.4px] mb-1.5">
              {firstName} has been released
            </div>
            <div className="text-[13px] text-text-dim leading-[1.6]">
              They've been notified and can now send you {category} recos again. Don't make them regret it.
            </div>
          </div>
          <button
            onClick={handleDone}
            className="w-full py-3.5 bg-accent text-accent-fg rounded-btn text-[14px] font-bold"
          >
            Done
          </button>
        </div>
      ) : (
        /* ── Sin bin detail ── */
        <div className="p-6 pt-3">
          <div className="w-[52px] h-[52px] rounded-full bg-bad/10 border border-bad/30 flex items-center justify-center mb-3.5">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div className="text-[19px] font-semibold text-white tracking-[-0.4px] mb-1.5">
            {friendName} is in the sin bin
          </div>
          <div className="text-[13px] text-text-dim leading-[1.6] mb-3.5">
            3 bad {category} recos in a row. Blocked from {category} recos until you let them out.
          </div>

          {offendingRecos.length > 0 && (
            <div className="bg-bg-card rounded-input p-3 mb-[18px]">
              <div className="text-[10px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">
                Offending recos
              </div>
              {offendingRecos.map((r) => (
                <div key={r.title} className="text-xs text-bad leading-[1.9]">
                  {r.title} · Bad
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-border rounded-input text-[13px] font-semibold text-text-dim hover:border-text-faint transition-colors"
            >
              Keep in
            </button>
            <button
              onClick={handleRelease}
              className="flex-[2] py-3 bg-bad text-white rounded-input text-[13px] font-semibold hover:opacity-90 transition-opacity"
            >
              Let {firstName} out
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
