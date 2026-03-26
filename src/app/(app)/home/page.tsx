'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { RecoCard } from '@/components/ui/RecoCard'
import { FeedbackSheet } from '@/components/overlays/FeedbackSheet'
import { SuccessOverlay } from '@/components/overlays/SuccessOverlay'
import { MapSheet } from '@/components/overlays/MapSheet'

import type { Reco } from '@/types/app.types'
import { INCOMPLETE_RECOS } from '@/lib/seed-recos'
import { ManualAddSheet } from '@/components/overlays/ManualAddSheet'
import { useRecos } from '@/lib/context/RecosContext'

const CATEGORY_FILTERS = [
  { value: 'all', label: 'all' },
  { value: 'restaurant', label: 'restaurants' },
  { value: 'tv', label: 'TV series' },
  { value: 'podcast', label: 'podcasts' },
  { value: 'music', label: 'music' },
  { value: 'book', label: 'books' },
]

const TIME_FILTERS = [
  { value: 'week', label: 'this week' },
  { value: 'month', label: 'this month' },
  { value: 'year', label: 'this year' },
  { value: 'all', label: 'all time' },
]

export default function HomePage() {
  const { manualRecos } = useRecos()
  const [catFilter, setCatFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [catDDOpen, setCatDDOpen] = useState(false)
  const [timeDDOpen, setTimeDDOpen] = useState(false)

  const [feedbackReco, setFeedbackReco] = useState<Reco | null>(null)
  const [successState, setSuccessState] = useState<{ reco: Reco; score: number } | null>(null)
  const [mapReco, setMapReco] = useState<Reco | null>(null)
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  const allIncomplete = [...manualRecos, ...INCOMPLETE_RECOS]
  const filtered = allIncomplete
    .filter((r) => catFilter === 'all' || r.category === catFilter)
    .filter((r) => !doneIds.has(r.id))

  function handleFeedbackSubmit(score: number, text: string) {
    if (!feedbackReco) return
    setDoneIds((prev) => new Set(prev).add(feedbackReco.id))
    setFeedbackReco(null)
    setSuccessState({ reco: feedbackReco, score })
  }

  return (
    <div className="flex flex-col flex-1 relative overflow-hidden">
      <StatusBar />

      {/* Nav */}
      <div className="flex justify-between items-center px-6 pt-5 pb-2.5 flex-shrink-0">
        <img src="/stars.svg" alt="reco" className="h-8 w-auto" />
        <div className="flex items-center gap-3">
          {/* Manual add */}
          <button
            onClick={() => setManualAddOpen(true)}
            aria-label="Add reco manually"
            className="cursor-pointer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="4" rx="1"/>
              <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          {/* Notification bell */}
          <Link href="/notifications" className="relative cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <div className="absolute -top-[3px] -right-[3px] w-2 h-2 rounded-full bg-accent" />
          </Link>
        </div>
      </div>

      {/* Intro filter headline */}
      <div className="px-6 pb-4 flex-shrink-0 relative z-10">
        <div className="text-[26px] font-semibold text-white leading-[1.2] tracking-[-0.6px] mb-0.5 mt-4">Hey Tyler,</div>
        <div className="text-[26px] font-semibold text-white leading-[1.2] tracking-[-0.6px] relative">
          {/* Category dropdown trigger */}
          <span
            className="text-accent border-b-[1.5px] border-accent cursor-pointer relative"
            onClick={() => { setCatDDOpen((o) => !o); setTimeDDOpen(false) }}
          >
            {CATEGORY_FILTERS.find((f) => f.value === catFilter)?.label ?? 'all'}
            {catDDOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-bg-elevated border border-border rounded-input z-50 min-w-[160px] overflow-hidden">
                {CATEGORY_FILTERS.map((f) => (
                  <div
                    key={f.value}
                    onClick={(e) => { e.stopPropagation(); setCatFilter(f.value); setCatDDOpen(false) }}
                    className={`px-4 py-3 text-sm cursor-pointer hover:bg-bg-card ${catFilter === f.value ? 'text-accent bg-bg-card' : 'text-text-secondary'}`}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            )}
          </span>
          {' '}recos from{' '}
          {/* Time dropdown trigger */}
          <span
            className="text-accent border-b-[1.5px] border-accent cursor-pointer relative"
            onClick={() => { setTimeDDOpen((o) => !o); setCatDDOpen(false) }}
          >
            {TIME_FILTERS.find((f) => f.value === timeFilter)?.label ?? 'all time'}
            {timeDDOpen && (
              <div className="absolute top-full right-0 mt-1.5 bg-bg-elevated border border-border rounded-input z-50 min-w-[160px] overflow-hidden">
                {TIME_FILTERS.map((f) => (
                  <div
                    key={f.value}
                    onClick={(e) => { e.stopPropagation(); setTimeFilter(f.value); setTimeDDOpen(false) }}
                    className={`px-4 py-3 text-sm cursor-pointer hover:bg-bg-card ${timeFilter === f.value ? 'text-accent bg-bg-card' : 'text-text-secondary'}`}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            )}
          </span>
        </div>

      </div>

      {/* Reco list */}
      <div
        className="flex-1 overflow-y-auto scrollbar-none px-5 pt-4 flex flex-col gap-3 pb-6"
        onClick={() => { setCatDDOpen(false); setTimeDDOpen(false) }}
      >
        {filtered.map((reco, i) => (
          <RecoCard
            key={reco.id}
            reco={reco}
            rank={i + 1}
            onMarkDone={setFeedbackReco}
            onShowMap={setMapReco}
          />
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-10">
            <div className="text-[15px] text-text-dim">No {catFilter === 'all' ? '' : catFilter} recos yet</div>
            <Link href="/send" className="text-accent text-sm font-semibold underline">Send one</Link>
          </div>
        )}
      </div>

      {/* Feedback sheet */}
      <FeedbackSheet
        open={!!feedbackReco}
        onClose={() => setFeedbackReco(null)}
        onSubmit={handleFeedbackSubmit}
        recoTitle={feedbackReco?.title ?? ''}
        recoCategory={feedbackReco ? feedbackReco.category : ''}
      />

      {/* Success overlay */}
      {successState && (
        <SuccessOverlay
          open={!!successState}
          onClose={() => setSuccessState(null)}
          score={successState.score}
          recoTitle={successState.reco.title}
        />
      )}

      {/* Map sheet */}
      <MapSheet
        open={!!mapReco}
        onClose={() => setMapReco(null)}
        name={mapReco?.title ?? ''}
        address={mapReco?.meta?.location}
      />

      {/* Manual add sheet */}
      <ManualAddSheet open={manualAddOpen} onClose={() => setManualAddOpen(false)} />
    </div>
  )
}
