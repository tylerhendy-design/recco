'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { CATEGORIES, type CategoryId, getCategoryLabel, getCategoryColor } from '@/constants/categories'
import { createClient } from '@/lib/supabase/client'
import { addPick, fetchUserPicks, type Pick } from '@/lib/data/picks'

const displayedCats = CATEGORIES.filter((c) => c.id !== 'custom')

const SINGULAR: Record<string, string> = {
  restaurant: 'restaurant', tv: 'TV show', podcast: 'podcast',
  music: 'album or track', book: 'book', film: 'film',
  bars: 'bar', clubs: 'club', cocktails: 'cocktail bar',
  culture: 'place', pubs: 'pub', wine_bars: 'wine bar',
  custom: 'thing',
}

export default function Top3Page() {
  return <Suspense><Top3Inner /></Suspense>
}

function Top3Inner() {
  const [userId, setUserId] = useState<string | null>(null)
  const [picks, setPicks] = useState<Pick[]>([])
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [city, setCity] = useState('')
  const [links, setLinks] = useState<string[]>([''])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const whyRef = useRef<HTMLTextAreaElement>(null)

  // Autocomplete
  type Suggestion = { title: string; subtitle: string | null; imageUrl: string | null; meta?: Record<string, string> }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userLocation = useRef<{ lat: number; lng: number } | null>(null)

  const VENUE_CATEGORIES = new Set(['restaurant', 'bars', 'clubs', 'cocktails', 'pubs', 'wine_bars'])
  const isVenue = category !== null && VENUE_CATEGORIES.has(category)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const p = await fetchUserPicks(user.id)
      setPicks(p)
    })
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => { userLocation.current = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
      () => { userLocation.current = { lat: 51.5074, lng: -0.1278 } }
    )
  }, [])

  const singular = category ? (SINGULAR[category] ?? getCategoryLabel(category).toLowerCase()) : ''
  const effectiveCat = category === 'custom' ? customCat.trim().toLowerCase() : (category ?? '')
  const categoryCount = picks.filter(p => p.category.toLowerCase().trim() === effectiveCat.toLowerCase().trim()).length
  const categoryFull = categoryCount >= 3
  const canSend = category !== null && title.trim().length > 0 && !sending && !categoryFull

  function handleTitleChange(val: string) {
    setTitle(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!val.trim() || val.trim().length < 2 || !category) {
      setSuggestions([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        let url = `/api/search?q=${encodeURIComponent(val.trim())}&category=${category}`
        if (isVenue && userLocation.current) {
          url += `&lat=${userLocation.current.lat}&lng=${userLocation.current.lng}`
        }
        const res = await fetch(url)
        const data = await res.json()
        setSuggestions(data)
      } catch {
        setSuggestions([])
      } finally {
        setSuggestionsLoading(false)
      }
    }, 300)
  }

  function selectSuggestion(s: Suggestion) {
    setTitle(s.title)
    if (s.meta?.city) setCity(s.meta.city)
    if (s.meta?.address && !city) setCity(s.meta.address)
    setSuggestions([])
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
  }

  async function handleSend() {
    if (!canSend || !userId || !category) return
    setSending(true)
    try {
      const finalCat = category === 'custom' ? customCat.trim().toLowerCase() : category
      await addPick(userId, finalCat, title.trim(), why.trim() || undefined, links.filter(l => l.trim()), city.trim() || undefined)
      setSending(false)
      setSent(true)
    } catch {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <StatusBar />
        <NavHeader title="TOP 03" closeHref="/profile" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-[22px] font-bold text-white tracking-[-0.5px] leading-[1.2] mb-2">Added to your TOP 03</div>
            <div className="text-[14px] text-text-dim leading-[1.6]">
              {categoryCount + 1 >= 3 ? 'Category complete.' : `${3 - categoryCount - 1} more to complete this category.`}
            </div>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <Link href="/profile" className="flex-1 py-3.5 border border-border rounded-btn text-[14px] font-semibold text-text-muted text-center">
              Back to profile
            </Link>
            <button
              onClick={() => { setSent(false); setTitle(''); setWhy(''); setCity(''); setLinks(['']); setSuggestions([]) }}
              className="flex-1 py-3.5 bg-accent text-accent-fg rounded-btn text-[14px] font-bold"
            >
              Add another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="TOP 03" closeHref="/profile" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
        <div className="bg-bg-card border border-border rounded-card px-4 py-4">

          {/* Category */}
          <div className="text-[22px] font-semibold text-white tracking-[-0.5px] leading-[1.1] mb-3">
            {category ? `Best ${singular}?` : 'Pick a category'}
          </div>
          <div className="flex gap-2 flex-wrap mb-4">
            {displayedCats.map((cat) => {
              const active = category === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(active ? null : cat.id as CategoryId); setTitle(''); setSuggestions([]) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip border transition-all text-[12px] font-semibold tracking-[0.3px] uppercase"
                  style={active
                    ? { color: cat.color, borderColor: cat.color, background: cat.bgColor }
                    : { color: '#777', borderColor: '#2a2a30' }
                  }
                >
                  <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: active ? cat.color : '#555' }} />
                  {cat.label}
                </button>
              )
            })}
            <button
              onClick={() => { setCategory(category === 'custom' ? null : 'custom'); setTitle(''); setSuggestions([]) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip transition-all text-[12px] font-semibold tracking-[0.3px] uppercase"
              style={category === 'custom'
                ? { color: '#D4E23A', border: '1px solid #D4E23A', background: 'rgba(212,226,58,0.08)' }
                : { color: '#777', border: '1px dashed #3a3a40' }
              }
            >
              Custom
            </button>
          </div>
          {category === 'custom' && (
            <input
              autoFocus
              className="mb-4 w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
              placeholder="e.g. Shopping, Coffee, Barbers..."
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value)}
            />
          )}

          {/* Category full warning */}
          {category && categoryFull && (
            <div className="bg-bad/5 border border-bad/20 rounded-xl px-4 py-3 mb-4 text-[13px] text-bad leading-[1.5]">
              You already have 3 in {getCategoryLabel(effectiveCat)}. Remove one from your profile to add another.
            </div>
          )}

          {/* Title + autocomplete */}
          {category && !categoryFull && (
            <>
              <div className="border-t border-[#0e0e10] mb-4" />
              <div className="mb-4">
                <input
                  autoFocus
                  className="text-[26px] font-bold text-white tracking-[-0.6px] leading-[1.1] w-full bg-transparent outline-none placeholder:text-[#444] font-sans"
                  placeholder={`Name of ${singular}...`}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />

                {/* Suggestions dropdown */}
                {(suggestions.length > 0 || suggestionsLoading) && (
                  <div className="mt-2 rounded-xl border border-border bg-bg-base overflow-hidden max-h-[280px] overflow-y-auto">
                    {suggestionsLoading && suggestions.length === 0 ? (
                      <div className="flex items-center justify-center py-3">
                        <div className="w-3.5 h-3.5 border-2 border-border border-t-white/50 rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => selectSuggestion(s)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border last:border-b-0 active:bg-white/5 transition-colors"
                          >
                            {s.imageUrl ? (
                              <img src={s.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-bg-card flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-semibold text-white truncate">{s.title}</div>
                              {s.subtitle && <div className="text-[11px] text-text-faint truncate">{s.subtitle}</div>}
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => { setSuggestions([]); if (searchTimeout.current) clearTimeout(searchTimeout.current) }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 border-t border-border active:bg-white/5 transition-colors"
                        >
                          <div className="w-9 h-9 rounded-lg bg-bg-card border border-border flex items-center justify-center flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-white truncate">Use "{title}"</div>
                            <div className="text-[11px] text-text-faint">Add it manually</div>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Why */}
              {title.trim().length > 0 && (
                <div className="anim-in mb-4">
                  <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5">Why is this in your top 3?</div>
                  <textarea
                    ref={whyRef}
                    className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[44px]"
                    placeholder="What makes it special?"
                    rows={1}
                    value={why}
                    onChange={(e) => {
                      setWhy(e.target.value)
                      const el = whyRef.current
                      if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
                    }}
                  />
                </div>
              )}

              {/* Location — for venues and custom categories */}
              {title.trim().length > 0 && (isVenue || category === 'custom') && (
                <div className="anim-in mb-4">
                  <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5">Location</div>
                  <input
                    className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
                    placeholder="e.g. London, Paris, New York..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              )}

              {/* Links */}
              {title.trim().length > 0 && (
                <div className="anim-in mb-4">
                  <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5">
                    Links <span className="normal-case font-normal text-[10px]">optional</span>
                  </div>
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center gap-2 flex-1 bg-bg-card border border-border rounded-input px-3.5 py-3">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                        </svg>
                        <input
                          className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-[#444] font-sans"
                          placeholder="Paste a URL..."
                          value={link}
                          onChange={(e) => { const n = [...links]; n[i] = e.target.value; setLinks(n) }}
                        />
                      </div>
                      {links.length > 1 && (
                        <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="text-text-faint hover:text-bad transition-colors flex-shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setLinks([...links, ''])} className="flex items-center gap-1.5 text-[12px] font-semibold text-text-faint hover:text-accent transition-colors mt-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add another link
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`mt-3 w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
            canSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          {sending ? 'Adding...' : 'Add to TOP 03'}
        </button>
      </div>
    </div>
  )
}
