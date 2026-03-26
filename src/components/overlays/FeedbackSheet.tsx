'use client'

import { useState } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { ScoreSlider } from '@/components/ui/ScoreSlider'
import { VoiceButton } from '@/components/ui/VoiceButton'

interface FeedbackSheetProps {
  open: boolean
  onClose: () => void
  onSubmit: (score: number, text: string) => void
  recoTitle: string
  recoCategory: string
}

export function FeedbackSheet({
  open,
  onClose,
  onSubmit,
  recoTitle,
  recoCategory,
}: FeedbackSheetProps) {
  const [score, setScore] = useState(50)
  const [text, setText] = useState('')
  const [hasVoice, setHasVoice] = useState(false)
  const [showError, setShowError] = useState(false)

  const hasReason = text.trim().length > 0 || hasVoice
  const canSubmit = hasReason

  function handleSubmit() {
    if (!canSubmit) {
      setShowError(true)
      return
    }
    onSubmit(score, text)
    setText('')
    setScore(50)
    setShowError(false)
  }

  function handleClose() {
    setText('')
    setScore(50)
    setHasVoice(false)
    setShowError(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="p-[22px] pt-3">
        <div className="text-[18px] font-semibold text-white tracking-[-0.4px] mb-1">
          {recoTitle}
        </div>
        <div className="text-xs text-text-faint mb-3.5">
          {recoCategory} · how was it?
        </div>

        <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">
          Slide to rate
        </div>
        <ScoreSlider value={score} onChange={setScore} className="mb-4" />

        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase">
            Tell them — required
          </div>
          <div className="text-[10px] text-text-faint">voice or type</div>
        </div>

        <div className="flex gap-2.5 items-center">
          <VoiceButton onRecorded={() => { setHasVoice(true); setShowError(false) }} />
          <input
            className={`flex-1 bg-bg-card border rounded-input px-3 py-2 text-[13px] text-text-secondary outline-none font-sans transition-colors ${
              showError && !hasReason ? 'border-bad/60 placeholder:text-bad/40' : 'border-border placeholder:text-border'
            }`}
            placeholder="What did you think?"
            value={text}
            onChange={(e) => { setText(e.target.value); setShowError(false) }}
          />
        </div>

        {showError && !hasReason && (
          <div className="text-[11px] text-bad mt-2 ml-[46px]">
            A reason is required — the recommender deserves to know why.
          </div>
        )}

        <div className="flex gap-2 mt-3.5">
          <button
            onClick={handleClose}
            className="flex-1 py-3 border border-border rounded-input text-[13px] font-semibold text-text-dim hover:border-text-faint transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`flex-[2] py-3 rounded-input text-[13px] font-bold transition-all ${
              canSubmit
                ? 'bg-accent text-accent-fg hover:opacity-90'
                : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
            }`}
          >
            Send feedback
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
