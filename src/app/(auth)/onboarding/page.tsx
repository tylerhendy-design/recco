'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { getCategoryColor } from '@/constants/categories'
import { getScoreColor } from '@/lib/utils'

// Preview components that mirror actual app UI — when the real components
// change, update these to match. They use the same colours and shared functions.

function SendPreview() {
  const cats = [
    { label: 'Restaurants', color: getCategoryColor('restaurant') },
    { label: 'TV Shows', color: getCategoryColor('tv') },
    { label: 'Podcasts', color: getCategoryColor('podcast') },
    { label: 'Films', color: getCategoryColor('film') },
    { label: 'Books', color: getCategoryColor('book') },
    { label: 'Custom', color: '#D4E23A' },
  ]
  return (
    <div className="bg-bg-card rounded-card p-4 border border-border text-left">
      <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] mb-2">Category</div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {cats.map((c) => (
          <span key={c.label} className="text-[10px] font-semibold px-2 py-1 rounded-chip border" style={{ color: c.color, borderColor: `${c.color}66` }}>
            {c.label}
          </span>
        ))}
      </div>
      <div className="text-[18px] font-bold text-white tracking-[-0.3px] mb-1">Padella</div>
      <div className="text-[11px] text-text-faint">Start typing to auto-fill details, images, and more</div>
    </div>
  )
}

function FeedbackPreview() {
  const scores = [9, 7, 4, 2]
  return (
    <div className="bg-bg-card rounded-card p-4 border border-border text-left">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-[13px] font-semibold text-white flex-1">How was it?</div>
        <div className="flex gap-1">
          {scores.map((s) => (
            <div key={s} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black" style={{ background: getScoreColor(s), color: s <= 4 ? '#fff' : '#000' }}>
              {s}
            </div>
          ))}
        </div>
      </div>
      <div className="h-2 bg-[#1a1a1e] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: '80%', background: getScoreColor(8) }} />
      </div>
      <div className="flex justify-between text-[10px] text-text-faint mt-1.5">
        <span>1</span>
        <span className="font-semibold" style={{ color: getScoreColor(8) }}>8/10</span>
        <span>10</span>
      </div>
    </div>
  )
}

function SinBinPreview() {
  return (
    <div className="bg-bg-card rounded-card p-4 border border-border text-left">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#2a0f0f] flex items-center justify-center flex-shrink-0">
          <span className="text-[15px]">🚨</span>
        </div>
        <div>
          <div className="text-[12px] font-semibold text-white">Sin binned</div>
          <div className="text-[10px] text-text-faint">3 strikes in Restaurants</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {[2, 3, 1].map((s, i) => (
          <span key={i} className="text-[10px] font-semibold px-2 py-[3px] rounded-chip" style={{ background: `${getScoreColor(s)}22`, color: getScoreColor(s) }}>
            {s}/10
          </span>
        ))}
        <span className="text-[10px] text-text-faint ml-1">→ sin bin</span>
      </div>
    </div>
  )
}

function PlacesPreview() {
  const cities = [
    { name: 'London', count: 14, colors: ['#F56E6E', '#5BC4F5', '#D4E23A'] },
    { name: 'Amsterdam', count: 7, colors: ['#F56E6E', '#A78BFA'] },
    { name: 'Paris', count: 3, colors: ['#F56E6E'] },
  ]
  return (
    <div className="bg-bg-card rounded-card border border-border overflow-hidden text-left">
      {cities.map((city, i) => (
        <div key={city.name} className={`flex items-center justify-between px-4 py-3 ${i < cities.length - 1 ? 'border-b border-[#1a1a1e]' : ''}`}>
          <div>
            <div className="text-[14px] font-semibold text-white">{city.name}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] text-text-faint">{city.count} recos</span>
              <div className="flex gap-0.5">
                {city.colors.map((c, j) => (
                  <span key={j} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      ))}
    </div>
  )
}

const SLIDES = [
  {
    step: '01 / 04',
    headline: 'Your friends know best',
    body: 'Restaurants, TV, music, podcasts, books, films — all the recos your friends give you, in one place. No algorithms. Just taste.',
    preview: <SendPreview />,
  },
  {
    step: '02 / 04',
    headline: 'Rate it. Close the loop.',
    body: 'Tried that restaurant? Watched that show? Slide to rate it 1–10. Your friend gets notified — they finally know if their taste holds up.',
    preview: <FeedbackPreview />,
  },
  {
    step: '03 / 04',
    headline: "Three strikes. You're out.",
    body: 'Give someone three bad recos in the same category and you land in the sin bin. They decide when you get out. Keeps everyone honest.',
    preview: <SinBinPreview />,
  },
  {
    step: '04 / 04',
    headline: 'Your personal map of recos',
    body: 'Every reco with a location lands on your Places page — grouped by city, shareable with friends. Perfect for planning trips.',
    preview: <PlacesPreview />,
  },
]

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
              <div className="flex-1 flex flex-col justify-center items-center px-8 pt-12 pb-0 text-center">
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

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-5">
                {SLIDES.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-accent' : 'w-1.5 bg-border'}`} />
                ))}
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
