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
  const [score, setScore] = useState(5)
  const [text, setText] = useState('')
  const [hasVoice, setHasVoice] = useState(false)
  const [showError, setShowError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const hasReason = text.trim().length > 0 || hasVoice
  const canSubmit = hasReason && !submitting

  async function handleSubmit() {
    if (!canSubmit) {
      setShowError(true)
      return
    }
    setSubmitting(true)
    try {
      await Promise.resolve(onSubmit(score, text))
      setText('')
      setScore(5)
      setShowError(false)
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    setText('')
    setScore(5)
    setHasVoice(false)
    setShowError(false)
    setSubmitting(false)
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

        <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-2">
          Your review
        </div>

        <textarea
          rows={1}
          className={`w-full bg-bg-card border rounded-input px-3.5 py-3 text-[14px] text-text-secondary outline-none font-sans resize-none min-h-[60px] focus:border-accent ${
            showError && !hasReason ? 'border-bad/60 placeholder:text-bad/40' : 'border-border placeholder:text-[#444]'
          }`}
          placeholder="Tell them what you thought. Details matter."
          value={text}
          onChange={(e) => { setText(e.target.value); setShowError(false); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
        />

        <div className="mt-2">
          <VoiceButton onRecorded={() => { setHasVoice(true); setShowError(false) }} />
          <div className="text-[10px] text-text-faint mt-1">We transcribe it so they can read or listen.</div>
        </div>

        {showError && !hasReason && (
          <div className="text-[11px] text-bad mt-2">
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
            disabled={!canSubmit}
            className={`flex-[2] py-3 rounded-input text-[13px] font-bold transition-all ${
              canSubmit
                ? 'bg-accent text-accent-fg hover:opacity-90'
                : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
                </svg>
                Sending…
              </span>
            ) : (
              'Send feedback'
            )}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
