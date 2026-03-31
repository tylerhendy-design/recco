'use client'

import { useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { CATEGORIES, type CategoryId, getCategoryLabel } from '@/constants/categories'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'

const displayedCats = CATEGORIES.filter((c) => c.id !== 'custom')

const SINGULAR: Record<string, string> = {
  restaurant: 'restaurant', tv: 'TV show', podcast: 'podcast',
  music: 'album or track', book: 'book', film: 'film',
  bars: 'bar', clubs: 'club', cocktails: 'cocktail bar',
  culture: 'place', pubs: 'pub', wine_bars: 'wine bar',
  custom: 'thing',
}

export default function ManualAddPage() {
  return <Suspense><ManualAddInner /></Suspense>
}

function ManualAddInner() {
  const [userId, setUserId] = useState<string | null>(null)
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [title, setTitle] = useState('')
  const [senderName, setSenderName] = useState('')
  const [why, setWhy] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const whyRef = useRef<HTMLTextAreaElement>(null)

  // Autocomplete
  type Suggestion = { title: string; subtitle: string | null; imageUrl: string | null; meta?: Record<string, string> }
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const userLocation = useRef<{ lat: number; lng: number } | null>(null)

  const VENUE_CATEGORIES = new Set(['restaurant', 'bars', 'clubs', 'cocktails', 'pubs', 'wine_bars'])
  const isVenue = category !== null && VENUE_CATEGORIES.has(category)

  // Load user + geolocation
  useState(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { userLocation.current = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
        () => { userLocation.current = { lat: 51.5074, lng: -0.1278 } }
      )
    }
  })

  const singular = category ? (SINGULAR[category] ?? getCategoryLabel(category).toLowerCase()) : ''

  function handleTitleChange(val: string) {
    setTitle(val)
    setSelectedMeta(null)
    setSelectedImage(null)
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

  const [selectedMeta, setSelectedMeta] = useState<Record<string, string> | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  function selectSuggestion(s: Suggestion) {
    setTitle(s.title)
    setSelectedMeta(s.meta ?? null)
    if (s.imageUrl) setSelectedImage(s.imageUrl)
    setSuggestions([])
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
  }
  const canSend = category !== null && title.trim().length > 0 && senderName.trim().length > 0 && !sending

  async function handleSend() {
    if (!canSend || !userId || !category) return
    setSending(true)
    setError(null)

    try {
      const supabase = createClient()
      const recoId = crypto.randomUUID()
      const finalCat = category === 'custom' ? 'custom' : category

      const meta: Record<string, unknown> = {
        manual_sender_name: senderName.trim(),
        ...(selectedMeta ?? {}),
        ...(selectedImage ? { artwork_url: selectedImage } : {}),
      }

      // Insert the recommendation — sender is the current user but meta tracks who actually gave it
      const { error: recoErr } = await supabase
        .from('recommendations')
        .insert({
          id: recoId,
          sender_id: userId,
          category: finalCat,
          custom_cat: category === 'custom' ? customCat.trim() : null,
          title: title.trim(),
          why_text: why.trim() || null,
          meta,
        })

      if (recoErr) { setError(recoErr.message); setSending(false); return }

      // Add self as recipient with status 'unseen'
      const { error: recipErr } = await supabase.from('reco_recipients').insert({
        reco_id: recoId,
        recipient_id: userId,
        status: 'unseen',
      })

      if (recipErr) { setError(recipErr.message); setSending(false); return }

      setSending(false)
      setSent(true)
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong')
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <StatusBar />
        <NavHeader title="Instant Add" closeHref="/home" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-[24px] font-bold text-white tracking-[-0.6px] leading-[1.2] mb-2">Added. Nice one.</div>
            <div className="text-[15px] text-text-dim leading-[1.6]">
              {senderName.trim().split(' ')[0]}'s reco is in your feed.
            </div>
          </div>
          <Link href="/home" className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold text-center mt-2">Back home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="Instant Add" closeHref="/home" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
        <div className="bg-bg-card border border-border rounded-card px-4 py-4">

          {/* Step 1: Who gave you this reco? */}
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">Who gave you this reco?</div>
          <input
            autoFocus
            className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans mb-4"
            placeholder="Their name..."
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />

          {/* Step 2: Category */}
          {senderName.trim().length > 0 && (
            <div className="anim-in">
              <div className="text-[20px] font-semibold text-white tracking-[-0.5px] leading-[1.1] mb-3">
                {category ? `What ${singular} did ${senderName.trim().split(' ')[0]} recommend?` : `What did ${senderName.trim().split(' ')[0]} recommend?`}
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                {displayedCats.map((cat) => {
                  const active = category === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(active ? null : cat.id as CategoryId)}
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
                  onClick={() => setCategory(category === 'custom' ? null : 'custom')}
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
                  placeholder="e.g. Architecture, Coffee, Barbers..."
                  value={customCat}
                  onChange={(e) => setCustomCat(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Step 3: Name of the reco + autocomplete */}
          {category && (
            <div className="anim-in">
              <div className="border-t border-[#0e0e10] mb-4" />
              <div className="mb-4">
                <input
                  autoFocus={category !== 'custom' || customCat.trim().length > 0}
                  className="text-[26px] font-bold text-white tracking-[-0.6px] leading-[1.1] w-full bg-transparent outline-none placeholder:text-[#444] font-sans"
                  placeholder={`Name of ${singular}...`}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                />
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
            </div>
          )}

          {/* Step 4: Why (optional) */}
          {title.trim().length > 0 && (
            <div className="anim-in">
              <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5">Why did they recommend it?</div>
              <textarea
                ref={whyRef}
                className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[44px]"
                placeholder="What did they say about it?"
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
        </div>

        {error && <div className="mt-3 text-[13px] text-red-400 text-center">{error}</div>}

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`mt-3 w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
            canSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          {sending ? 'Adding...' : `Add ${senderName.trim().split(' ')[0] || ''}'s reco`}
        </button>
      </div>
    </div>
  )
}
