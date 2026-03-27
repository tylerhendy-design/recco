'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

const SLIDES = [
  {
    step: '01 / 05',
    headline: 'Your collection of recommendations',
    body: 'Everything your friends have ever told you to watch, eat, listen to — in one place. Human taste, no algorithms.',
    preview: null,
  },
  {
    step: '02 / 05 — Sending',
    headline: 'Tap + to send a reco',
    body: 'Restaurants, TV, music, podcasts, books, films — or create your own category. Add links, locations, Spotify tracks, even images.',
    preview: (
      <div className="bg-bg-card rounded-card p-5 border border-border">
        <div className="flex justify-between items-center mb-3.5">
          <div className="text-[13px] text-white font-semibold">Sending: BAO Soho</div>
          <div className="w-7 h-7 rounded-full border-2 border-accent flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 18 18" fill="none" stroke="#D4E23A" strokeWidth="2.2" strokeLinecap="round">
              <line x1="9" y1="3" x2="9" y2="15"/><line x1="3" y1="9" x2="15" y2="9"/>
            </svg>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[11px] px-2.5 py-[5px] rounded-chip border border-[#F56E6E] text-[#F56E6E]">Restaurant</span>
          <span className="text-[11px] px-2.5 py-[5px] rounded-chip border border-border text-text-dim">Soho, London</span>
          <span className="text-[11px] px-2.5 py-[5px] rounded-chip border border-border text-text-dim">@baosoho</span>
        </div>
      </div>
    ),
  },
  {
    step: '03 / 05 — Feedback',
    headline: 'Close the loop',
    body: "When you finish a restaurant or show, mark it as done. Slide to rate it. Your friends get notified — that's vicarious joy.",
    preview: (
      <div className="bg-bg-card rounded-card p-5 border border-border">
        <div className="text-[13px] text-white font-semibold mb-1">The Boys</div>
        <div className="text-[11px] text-text-faint mb-4">Sam Huckle reco'd this</div>
        <div className="relative h-1 bg-border rounded-full mb-2">
          <div className="absolute left-0 top-0 h-1 w-[78%] bg-accent rounded-full" />
          <div className="absolute top-[-6px] h-4 w-4 rounded-full bg-accent" style={{ left: 'calc(78% - 8px)' }} />
        </div>
        <div className="flex justify-between text-[10px] text-text-faint">
          <span>Bad</span><span className="text-accent font-semibold">Good — 78</span><span>Good</span>
        </div>
      </div>
    ),
  },
  {
    step: '04 / 05 — Sin bin',
    headline: "Three strikes. You're out.",
    body: 'Give someone three bad recos in the same category and you\'re sin-binned. No more restaurant recos for Huckle until he lets you out.',
    preview: (
      <div className="bg-bg-card rounded-card p-4 border border-border">
        {/* Notification header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#2a0f0f] flex items-center justify-center flex-shrink-0">
            <span className="text-[15px]">🚫</span>
          </div>
          <div>
            <div className="text-[12px] font-semibold text-white">Sin bin — Restaurants</div>
            <div className="text-[10px] text-text-faint">Just now</div>
          </div>
        </div>
        {/* Divider */}
        <div className="border-t border-border mb-3" />
        {/* Body */}
        <div className="text-[12px] text-text-secondary leading-[1.6]">
          You gave <span className="text-white font-medium">Huckle</span> three bad restaurant recos. You&apos;re in the sin bin for Restaurants — he decides when you&apos;re out.
        </div>
        {/* Score trail */}
        <div className="flex items-center gap-1.5 mt-3">
          <span className="text-[10px] font-semibold px-2 py-[3px] rounded-chip bg-[#2a0f0f] text-[#F56E6E]">Bad · 22</span>
          <span className="text-[10px] font-semibold px-2 py-[3px] rounded-chip bg-[#2a0f0f] text-[#F56E6E]">Bad · 18</span>
          <span className="text-[10px] font-semibold px-2 py-[3px] rounded-chip bg-[#2a0f0f] text-[#F56E6E]">Bad · 31</span>
        </div>
      </div>
    ),
  },
  {
    step: '05 / 05 — Lists',
    headline: 'Give and get guides',
    body: 'Create a list — places to eat in Paris, things to do in Tokyo — and send it as a guide. Less curated than a reco, more generous than a link.',
    preview: (
      <div className="bg-bg-card rounded-card p-4 border border-border">
        <div className="text-[13px] font-semibold text-white mb-1">Paris — a few things</div>
        <div className="text-[11px] text-text-faint mb-3">Tyler · 8 places</div>
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F56E6E] flex-shrink-0 block" />Bistrot Paul Bert
          </div>
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#5BC4F5] flex-shrink-0 block" />Shakespeare and Co.
          </div>
          <div className="text-xs text-text-secondary flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F56E6E] flex-shrink-0 block" />Frenchie
          </div>
          <div className="text-[11px] text-text-faint">+5 more</div>
        </div>
      </div>
    ),
  },
]

function HeartSVG({ color }: { color: string }) {
  return (
    <svg width="7" height="7" viewBox="0 0 24 24" fill={color}>
      <path d="M12 21C12 21 3 13.5 3 8a5 5 0 0110 0 5 5 0 0110 0c0 5.5-9 13-9 13z" />
    </svg>
  )
}

export default function OnboardingPage() {
  const [step, setStep] = useState(-1)
  const isSplash = step === -1
  const slide = isSplash ? null : SLIDES[step]
  const isLast = step === SLIDES.length - 1

  useEffect(() => {
    if (isSplash) {
      const t = setTimeout(() => setStep(0), 1600)
      return () => clearTimeout(t)
    }
  }, [isSplash])

  return (
    <div className="min-h-svh bg-[#d8d8d8] flex items-center justify-center">
      <div className="relative flex flex-col w-full md:w-[390px] min-h-svh md:h-[844px] md:min-h-0 bg-bg-base md:rounded-[48px] md:border md:border-[#2a2a2e] md:shadow-phone md:overflow-hidden font-sans">

        <AnimatePresence mode="wait">
          {isSplash ? (
            <motion.div
              key="splash"
              className="flex-1 flex items-center justify-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.45, ease: 'easeInOut' } }}
            >
              <motion.img
                src="/wordmark.svg"
                alt="reco."
                className="h-11 w-auto"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
              />
            </motion.div>
          ) : (
            <motion.div
              key={`slide-${step}`}
              className="flex flex-col flex-1"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' } }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
            >
              <div className="flex-1 flex flex-col justify-center items-center px-9 pt-12 pb-0 text-center">
                <div className="text-[11px] font-semibold text-accent tracking-[1px] uppercase mb-3.5">
                  {slide!.step}
                </div>
                <div className="text-[28px] font-bold text-white tracking-[-0.8px] leading-[1.2] mb-4">
                  {slide!.headline}
                </div>
                <div className="text-[15px] text-text-muted leading-[1.7] mb-8">
                  {slide!.body}
                </div>
                {slide!.preview && (
                  <div className="w-full">{slide!.preview}</div>
                )}
              </div>

              <div className="px-9 pb-11 flex flex-col gap-3 flex-shrink-0">
                {isLast ? (
                  <Link
                    href="/login"
                    className="bg-accent text-accent-fg text-center py-4 rounded-btn text-[15px] font-bold"
                  >
                    Get started
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setStep((s) => s + 1)}
                      className="bg-accent text-accent-fg text-center py-4 rounded-btn text-[15px] font-bold w-full"
                    >
                      Next
                    </button>
                    <Link
                      href="/login"
                      className="text-center text-[13px] text-text-faint py-2 cursor-pointer"
                    >
                      Skip intro
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
