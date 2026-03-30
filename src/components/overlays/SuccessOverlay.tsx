'use client'

import { scoreLabel } from '@/constants/tiers'

interface SuccessOverlayProps {
  open: boolean
  onClose: () => void
  score: number
  recoTitle: string
  recommenderName?: string
  sinBinWarning?: { category: string; remaining: number }
}

const HEADLINES: Record<string, string> = {
  bad: 'You hated it.',
  meh: 'You were unmoved.',
  good: 'You loved it.',
}

const SUBS: Record<string, string> = {
  bad: 'And now they know.',
  meh: 'And they know that too.',
  good: 'And now they know you did.',
}

export function SuccessOverlay({ open, onClose, score, recoTitle, recommenderName, sinBinWarning }: SuccessOverlayProps) {
  if (!open) return null

  const sentiment = scoreLabel(score)
  const firstName = recommenderName?.split(' ')[0]

  return (
    <div className="absolute inset-0 z-[150] bg-black/85 flex flex-col items-center justify-center px-8 text-center animate-fade-in">
      <div className="w-[68px] h-[68px] rounded-full bg-accent/15 border-2 border-accent flex items-center justify-center mb-[22px]">
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none" stroke="#D4E23A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 16l8 8 12-12" />
        </svg>
      </div>

      <div className="text-[26px] font-bold text-white tracking-[-0.6px] leading-[1.2] mb-2.5">
        {HEADLINES[sentiment]}
      </div>
      <div className="text-[15px] text-text-dim leading-[1.6] mb-[22px]">
        {firstName ? SUBS[sentiment].replace('they', firstName) : SUBS[sentiment]}
      </div>

      <div className="text-[14px] font-semibold text-text-secondary bg-bg-card border border-border rounded-input px-[22px] py-3">
        {recoTitle}
      </div>

      {sinBinWarning && (
        <div className="mt-5 px-4 py-3 bg-bad/10 border border-bad/30 rounded-input w-full text-left">
          <div className="text-[12px] font-semibold text-bad mb-0.5">Heads up</div>
          <div className="text-[13px] text-bad/80 leading-[1.5]">
            {sinBinWarning.remaining === 1
              ? `One more bad ${sinBinWarning.category} reco from ${firstName ?? 'them'} and they're in the sin bin.`
              : `${sinBinWarning.remaining} more ${sinBinWarning.category} stinkers from ${firstName ?? 'them'} and they're in the sin bin.`
            }
          </div>
        </div>
      )}

      <button
        onClick={onClose}
        className="mt-7 bg-accent text-accent-fg px-9 py-[15px] rounded-btn text-sm font-bold hover:opacity-90 transition-opacity"
      >
        Back to recos
      </button>
    </div>
  )
}
