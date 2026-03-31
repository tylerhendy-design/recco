'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'

interface NoGoSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string) => void
  recoTitle: string
  senderName: string
}

export function NoGoSheet({ open, onClose, onSubmit, recoTitle, senderName }: NoGoSheetProps) {
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)

  function handleSubmit() {
    if (!reason.trim()) { setShowError(true); return }
    onSubmit(reason.trim())
    setReason('')
    setShowError(false)
  }

  function handleClose() {
    setReason('')
    setShowError(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="p-[22px] pt-3">
        <div className="text-[18px] font-semibold text-white tracking-[-0.4px] mb-1">
          {recoTitle}
        </div>
        <div className="text-xs text-text-faint mb-4">
          {senderName} will be told why you're not doing this.
        </div>

        <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">
          Why is it a no go?
        </div>
        <textarea
          rows={1}
          autoFocus
          className={`w-full bg-bg-card border rounded-input px-3.5 py-3 text-[14px] text-text-secondary outline-none font-sans resize-none min-h-[44px] focus:border-accent ${
            showError ? 'border-bad/60 placeholder:text-bad/40' : 'border-border placeholder:text-[#444]'
          }`}
          placeholder="e.g. I'm vegetarian, too far away, already been…"
          value={reason}
          onChange={(e) => { setReason(e.target.value); setShowError(false); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
        />
        {showError && (
          <div className="text-[11px] text-bad mt-1.5">
            A reason is required — {senderName} deserves to know.
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleClose}
            className="flex-1 py-3 border border-border rounded-input text-[13px] font-semibold text-text-dim hover:border-text-faint transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] py-3 rounded-input text-[13px] font-bold bg-bad/20 text-bad border border-bad/30 hover:bg-bad/30 transition-all"
          >
            Mark as no go
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
