'use client'

import { useState, useMemo } from 'react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { CATEGORIES } from '@/constants/categories'
import { useRecos } from '@/lib/context/RecosContext'
import type { CategoryId } from '@/types/app.types'

interface ManualAddSheetProps {
  open: boolean
  onClose: () => void
}

// Score-based category detection — highest scorer wins (min score 2).
function detectCategory(text: string): string | null {
  const t = text.toLowerCase()
  const scores: Record<string, number> = {}
  const add = (cat: string, n: number) => { scores[cat] = (scores[cat] ?? 0) + n }

  // Music — album/song must be present; "listen" alone is not enough
  if (/\balbum\b/.test(t))                             add('music', 4)
  if (/\bsong\b|\btrack\b/.test(t))                    add('music', 3)
  if (/\bartist\b|\bband\b/.test(t))                   add('music', 3)
  if (/\bplaylist\b|\bmusic\b/.test(t))                add('music', 3)
  if (/\bgig\b|\bconcert\b/.test(t))                   add('music', 4)
  if (/\blisten\b/.test(t))                            add('music', 1) // weak only

  // Podcast — explicit keyword required
  if (/\bpodcast\b/.test(t))                           add('podcast', 6)
  if (/\bpod\b/.test(t))                               add('podcast', 2)
  if (/\bepisode\b/.test(t) && !/season|series/.test(t)) add('podcast', 2)

  // Restaurant
  if (/\brestaurant\b/.test(t))                        add('restaurant', 5)
  if (/\bcafe\b|\bcoffee\b/.test(t))                   add('restaurant', 4)
  if (/\beat\b|\bfood\b|\bdining\b/.test(t))           add('restaurant', 3)
  if (/\bdinner\b|\blunch\b|\bbrunch\b/.test(t))       add('restaurant', 3)
  if (/\bmenu\b|\bbooking\b|\breservation\b|\btable\b/.test(t)) add('restaurant', 3)
  if (/\bbistro\b|\bbrasserie\b/.test(t))              add('restaurant', 3)

  // Book
  if (/\bbook\b/.test(t))                              add('book', 4)
  if (/\bauthor\b|\bnovel\b|\bfiction\b/.test(t))      add('book', 4)
  if (/\bread(?:ing)?\b/.test(t))                      add('book', 2)
  if (/\bchapter\b|\bpages?\b/.test(t))                add('book', 3)
  if (/\bkindle\b|\bgoodreads\b|\bpaperback\b/.test(t)) add('book', 5)

  // Film
  if (/\bfilm\b/.test(t))                              add('film', 5)
  if (/\bmovie\b/.test(t))                             add('film', 5)
  if (/\bcinema\b/.test(t))                            add('film', 5)
  if (/\bdirector\b|\bactor\b|\bactress\b/.test(t))    add('film', 3)
  if (/\bimdb\b/.test(t))                              add('film', 4)

  // TV
  if (/\bnetflix\b|\bhbo\b|\bdisney\+\b|\bprime video\b|\bapple tv\b/.test(t)) add('tv', 3)
  if (/\bstreaming\b/.test(t))                         add('tv', 2)
  if (/\bseries\b|\bseason\b/.test(t))                 add('tv', 4)
  if (/\bshow\b/.test(t))                              add('tv', 2)
  if (/\bbinge\b/.test(t))                             add('tv', 3)
  if (/\bwatch\b/.test(t))                             add('tv', 1)

  if (Object.keys(scores).length === 0) return null
  const [topCat, topScore] = Object.entries(scores).sort(([, a], [, b]) => b - a)[0]
  return topScore >= 2 ? topCat : null
}

const KNOWN_CATS = CATEGORIES.filter((c) => c.id !== 'custom')

export function ManualAddSheet({ open, onClose }: ManualAddSheetProps) {
  const { addManualReco } = useRecos()

  const [recoTitle, setRecoTitle] = useState('')
  const [senderName, setSenderName] = useState('')
  const [contact, setContact] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [why, setWhy] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [catLabel, setCatLabel] = useState('')
  const [wasDetected, setWasDetected] = useState(false)
  const [catSearch, setCatSearch] = useState('')
  const [done, setDone] = useState(false)

  const filteredCats = useMemo(() => {
    const q = catSearch.trim().toLowerCase()
    if (!q) return KNOWN_CATS
    return KNOWN_CATS.filter((c) => c.label.toLowerCase().includes(q))
  }, [catSearch])

  const exactMatch = KNOWN_CATS.some(
    (c) => c.label.toLowerCase() === catSearch.trim().toLowerCase()
  )
  const showAddOption = catSearch.trim().length > 0 && !exactMatch

  function handlePaste(text: string) {
    setPastedText(text)
    if (!category) {
      const detected = detectCategory(text)
      if (detected) {
        const def = KNOWN_CATS.find((c) => c.id === detected)
        setCategory(detected)
        setCatLabel(def?.label ?? detected)
        setWasDetected(true)
      }
    }
  }

  function selectKnown(id: string, label: string) {
    setCategory(id)
    setCatLabel(label)
    setWasDetected(false)
    setCatSearch('')
  }

  function selectCustom(label: string) {
    setCategory('custom')
    setCatLabel(label)
    setWasDetected(false)
    setCatSearch('')
  }

  function clearCategory() {
    setCategory(null)
    setCatLabel('')
    setWasDetected(false)
    setCatSearch('')
  }

  function handleAdd() {
    if (!recoTitle.trim()) return

    const isKnown = KNOWN_CATS.some((c) => c.id === category)
    const effectiveCat = (isKnown ? category : 'custom') as CategoryId

    addManualReco({
      id: `manual-${Date.now()}`,
      sender_id: 'manual',
      sender: {
        id: 'manual',
        display_name: senderName.trim() || 'Someone',
        username: 'manual',
        avatar_url: null,
      },
      category: effectiveCat,
      custom_cat: effectiveCat === 'custom' ? catLabel || undefined : undefined,
      title: recoTitle.trim(),
      why_text: why.trim() || pastedText.trim() || undefined,
      meta: {},
      created_at: new Date().toISOString(),
      status: 'unseen',
      recommenders: senderName.trim()
        ? [{ profile: { id: 'manual', display_name: senderName.trim(), avatar_url: null }, why_text: why.trim() || pastedText.trim() || undefined, tier: 'tribe' }]
        : undefined,
    })

    setDone(true)
  }

  function handleClose() {
    setRecoTitle('')
    setSenderName('')
    setContact('')
    setPastedText('')
    setWhy('')
    setCategory(null)
    setCatLabel('')
    setWasDetected(false)
    setCatSearch('')
    setDone(false)
    onClose()
  }

  const selectedDef = KNOWN_CATS.find((c) => c.id === category)

  if (done) {
    return (
      <BottomSheet open={open} onClose={handleClose}>
        <div className="p-[22px] pt-4 flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mt-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-[18px] font-bold text-white tracking-[-0.4px] mb-1.5">{recoTitle} added.</div>
            <div className="text-[13px] text-text-dim leading-[1.6]">
              It&apos;s now in your feed and on the browse page.
            </div>
          </div>
          <button onClick={handleClose} className="w-full bg-accent text-accent-fg py-3.5 rounded-btn text-[14px] font-bold mt-1">
            Done
          </button>
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <div className="p-[22px] pt-3 max-h-[85vh] overflow-y-auto">
        <div className="text-[18px] font-semibold text-white tracking-[-0.4px] mb-0.5">Add a reco</div>
        <div className="text-[12px] text-text-faint mb-4">From someone not on RECO yet</div>

        <div className="flex flex-col gap-3">

          {/* Paste message — first, drives auto-detection */}
          <div>
            <div className="text-[11px] font-semibold text-text-muted tracking-[0.5px] uppercase mb-1.5">
              Paste their message{' '}
              <span className="normal-case font-normal text-[10px] text-text-faint">optional — category auto-detected</span>
            </div>
            <textarea
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[44px] leading-[1.5]"
              placeholder={'e.g. \u201cYou have to listen to the new Tame Impala album\u2026\u201d'}
              rows={1}
              value={pastedText}
              onChange={(e) => { handlePaste(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
            />
          </div>

          {/* What's the reco */}
          <div>
            <div className="text-[11px] font-semibold text-text-muted tracking-[0.5px] uppercase mb-1.5">What&apos;s the reco?</div>
            <input
              autoFocus
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
              placeholder="e.g. Tame Impala — The Slow Rush"
              value={recoTitle}
              onChange={(e) => setRecoTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>

          {/* Why */}
          <div>
            <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-1.5">Why?</div>
            <input
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
              placeholder="Why did they recommend it?"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>

          {/* Category */}
          <div>
            <div className="text-[11px] font-semibold text-text-muted tracking-[0.5px] uppercase mb-1.5 flex items-center gap-2">
              Category
              {wasDetected && category && (
                <span className="normal-case font-normal text-[10px] text-accent">detected from message</span>
              )}
            </div>

            {category ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px] font-semibold px-3 py-1.5 rounded-chip border flex items-center gap-1.5"
                  style={
                    selectedDef
                      ? { color: selectedDef.color, borderColor: selectedDef.color, background: selectedDef.bgColor }
                      : { color: '#D4E23A', borderColor: '#D4E23A', background: 'rgba(212,226,58,0.08)' }
                  }
                >
                  {catLabel}
                  <button onClick={clearCategory} aria-label="Remove category" className="ml-0.5 opacity-70 hover:opacity-100 transition-opacity">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
                    </svg>
                  </button>
                </span>
                <button onClick={clearCategory} className="text-[12px] text-text-faint hover:text-text-dim transition-colors">
                  Change
                </button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    className="w-full bg-bg-card border border-border rounded-input pl-8 pr-3 py-3 text-[14px] text-white outline-none placeholder:text-[#444] focus:border-accent font-sans"
                    placeholder="Search or add a category…"
                    value={catSearch}
                    onChange={(e) => setCatSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-[6px]">
                  {filteredCats.map((cat) => (
                    <span
                      key={cat.id}
                      onClick={() => selectKnown(cat.id, cat.label)}
                      className="text-[12px] font-medium px-2.5 py-[5px] rounded-chip border cursor-pointer transition-colors hover:border-text-faint"
                      style={{ color: '#909099', borderColor: '#2a2a30' }}
                    >
                      {cat.label}
                    </span>
                  ))}
                  {showAddOption && (
                    <span
                      onClick={() => selectCustom(catSearch.trim())}
                      className="text-[12px] font-medium px-2.5 py-[5px] rounded-chip border border-dashed border-accent/40 text-accent/70 cursor-pointer hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
                    >
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
                      </svg>
                      Add &ldquo;{catSearch.trim()}&rdquo;
                    </span>
                  )}
                  {filteredCats.length === 0 && !showAddOption && (
                    <span className="text-[12px] text-text-faint">No categories found</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Who recommended it */}
          <div>
            <div className="text-[11px] font-semibold text-text-muted tracking-[0.5px] uppercase mb-1.5">
              Who recommended it?{' '}
              <span className="normal-case font-normal text-[10px] text-text-faint">optional</span>
            </div>
            <input
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
              placeholder="e.g. Sam Huckle"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
            />
          </div>

          {/* Contact */}
          <div>
            <div className="text-[11px] font-semibold text-text-muted tracking-[0.5px] uppercase mb-1.5">
              Their contact{' '}
              <span className="normal-case font-normal text-[10px] text-text-faint">optional — to invite them</span>
            </div>
            <input
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
              placeholder="+44 7700… or name@email.com"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              inputMode="email"
            />
          </div>

        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={handleClose}
            className="flex-1 py-3 border border-border rounded-input text-[13px] font-semibold text-text-dim hover:border-text-faint transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!recoTitle.trim()}
            className={`flex-[2] py-3 rounded-input text-[13px] font-bold transition-all ${
              recoTitle.trim()
                ? 'bg-accent text-accent-fg hover:opacity-90'
                : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
            }`}
          >
            Add reco
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
