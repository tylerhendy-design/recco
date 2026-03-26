'use client'

import { useState, useMemo } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { VoiceButton } from '@/components/ui/VoiceButton'
import { ManualAddSheet } from '@/components/overlays/ManualAddSheet'
import { CATEGORIES } from '@/constants/categories'
import Link from 'next/link'

const PEOPLE = ['Huckle', 'Tyler', 'Horlock', 'Mum', 'Big Jimmy', 'Sam', 'Jo', 'Priya', 'Marcus']

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-5">
      <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase mb-3.5">
        {label}
      </div>
      {children}
    </div>
  )
}

export default function GetPage() {
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [context, setContext] = useState('')
  const [friendSearch, setFriendSearch] = useState('')

  const allSelected = selectedPeople.length === PEOPLE.length

  function togglePerson(name: string) {
    setSelectedPeople((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    )
  }

  function toggleAll() {
    setSelectedPeople(allSelected ? [] : [...PEOPLE])
  }

  const filteredPeople = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return PEOPLE
    return PEOPLE.filter((name) => name.toLowerCase().includes(q))
  }, [friendSearch])

  const effectiveCat = selectedCat === 'custom' ? customCat.trim() || null : selectedCat
  const canSend = query.trim().length > 0 && selectedPeople.length > 0
  const [sent, setSent] = useState(false)
  const [manualAddOpen, setManualAddOpen] = useState(false)

  if (sent) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <StatusBar />
        <NavHeader title="get a reco" closeHref="/home" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-1">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div>
            <div className="text-[24px] font-bold text-white tracking-[-0.6px] leading-[1.2] mb-2">
              Ask and you shall receive.
            </div>
            <div className="text-[15px] text-text-dim leading-[1.6]">
              Request successfully sent to {selectedPeople.length === PEOPLE.length ? 'everyone' : selectedPeople.length === 1 ? selectedPeople[0] : `${selectedPeople.length} people`}.
            </div>
          </div>
          <Link
            href="/home"
            className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold text-center mt-2"
          >
            Back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="get a reco" closeHref="/home" rightAction={
        <button
          onClick={() => setManualAddOpen(true)}
          aria-label="Add person manually"
          className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-text-faint hover:border-accent hover:text-accent transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="4" rx="1"/>
            <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2"/>
            <line x1="12" y1="11" x2="12" y2="17"/>
            <line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
        </button>
      } />

      <div className="flex-1 overflow-y-auto scrollbar-none px-5 pt-4 flex flex-col gap-3 pb-6">

        {/* What */}
        <SectionCard label="What are you after?">
          <input
            autoFocus
            className="bg-transparent outline-none text-white font-sans text-[17px] font-normal w-full tracking-[-0.3px] placeholder:text-[#2a2a30]"
            placeholder="e.g. a great Italian in Soho..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </SectionCard>

        {/* Category */}
        <SectionCard label="Category">
          <div className="flex flex-wrap gap-[7px]">
            {CATEGORIES.filter((c) => c.id !== 'custom').map((cat) => (
              <span
                key={cat.id}
                onClick={() => { setSelectedCat(cat.id === selectedCat ? null : cat.id); setShowCustomInput(false) }}
                className="text-[13px] font-medium px-3 py-[7px] rounded-chip border cursor-pointer transition-all"
                style={
                  selectedCat === cat.id
                    ? { color: cat.color, borderColor: cat.color, background: cat.bgColor }
                    : { color: '#909099', borderColor: '#2a2a30' }
                }
              >
                {cat.label}
              </span>
            ))}
            {/* Custom */}
            <span
              onClick={() => {
                if (selectedCat === 'custom') {
                  setSelectedCat(null)
                  setShowCustomInput(false)
                  setCustomCat('')
                } else {
                  setSelectedCat('custom')
                  setShowCustomInput(true)
                }
              }}
              className="text-[13px] font-medium px-3 py-[7px] rounded-chip border cursor-pointer transition-all"
              style={
                selectedCat === 'custom'
                  ? { color: '#D4E23A', borderColor: '#D4E23A', background: 'rgba(212,226,58,0.08)' }
                  : { color: '#909099', borderColor: '#2a2a30' }
              }
            >
              + Custom
            </span>
          </div>

          {showCustomInput && (
            <input
              autoFocus
              className="mt-3 w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-white outline-none placeholder:text-border font-sans"
              placeholder="e.g. Architecture, Coffee..."
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value)}
            />
          )}
        </SectionCard>

        {/* Ask */}
        <SectionCard label="Ask">
          <div className="flex items-center justify-between mb-3">
            <div className="relative flex-1 mr-2">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                width="11" height="11" viewBox="0 0 24 24" fill="none"
                stroke="#777" strokeWidth="2.5" strokeLinecap="round"
              >
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="w-full bg-bg-base border border-border rounded-input pl-8 pr-3 py-1.5 text-[13px] text-text-secondary outline-none placeholder:text-border font-sans"
                placeholder="Search friends..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
              />
            </div>
            <button
              onClick={toggleAll}
              className={`text-[12px] font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${allSelected ? 'text-accent' : 'text-text-faint hover:text-text-muted'}`}
            >
              {allSelected ? 'Deselect all' : 'Ask everyone'}
            </button>
          </div>

          <div className="flex flex-wrap gap-[7px]">
            {filteredPeople.length > 0 ? filteredPeople.map((name) => (
              <span
                key={name}
                onClick={() => togglePerson(name)}
                className={`text-[13px] font-medium px-3 py-[7px] rounded-chip border cursor-pointer transition-all ${
                  selectedPeople.includes(name)
                    ? 'border-accent text-accent bg-accent/10'
                    : 'border-border text-text-dim hover:border-text-faint'
                }`}
              >
                {name}
              </span>
            )) : (
              <span className="text-[13px] text-text-faint">No friends found</span>
            )}
          </div>

          {selectedPeople.length > 0 && (
            <div className="mt-3 text-[12px] text-text-faint">
              Asking {selectedPeople.length === PEOPLE.length ? 'everyone' : `${selectedPeople.length} ${selectedPeople.length === 1 ? 'person' : 'people'}`}
            </div>
          )}
        </SectionCard>

        {/* Context */}
        <SectionCard label="More context">
          <div className="flex gap-2.5 items-center">
            <VoiceButton />
            <input
              className="flex-1 bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-text-secondary outline-none placeholder:text-border font-sans"
              placeholder="Add context..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
        </SectionCard>

        <button
          onClick={() => canSend && setSent(true)}
          className={`w-full py-[15px] rounded-btn text-[15px] font-bold text-center transition-all ${
            canSend
              ? 'bg-accent text-accent-fg hover:opacity-90'
              : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          Request reco&apos;s
        </button>
      </div>

      <ManualAddSheet open={manualAddOpen} onClose={() => setManualAddOpen(false)} />
    </div>
  )
}
