'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { type CategoryId, getCategoryLabel } from '@/constants/categories'
import { CategoryChips } from '@/components/ui/CategoryChips'
import { AutocompleteInput, type Suggestion } from '@/components/ui/AutocompleteInput'
import { createClient } from '@/lib/supabase/client'

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

export function ManualAddInner({ embedded }: { embedded?: boolean } = {}) {
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

  // Recent sender names from localStorage
  const [recentSenders, setRecentSenders] = useState<string[]>([])
  useEffect(() => {
    try {
      const stored = localStorage.getItem('reco-recent-senders')
      if (stored) setRecentSenders(JSON.parse(stored))
    } catch {}
  }, [])

  function saveRecentSender(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const updated = [trimmed, ...recentSenders.filter(n => n.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10)
    setRecentSenders(updated)
    try { localStorage.setItem('reco-recent-senders', JSON.stringify(updated)) } catch {}
  }

  const userLocation = useRef<{ lat: number; lng: number } | null>(null)

  const VENUE_CATEGORIES = new Set(['restaurant', 'bars', 'clubs', 'cocktails', 'pubs', 'wine_bars', 'culture'])
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

  const [selectedMeta, setSelectedMeta] = useState<Record<string, string> | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  function handleTitleChange(val: string) {
    setTitle(val)
    setSelectedMeta(null)
    setSelectedImage(null)
  }

  function handleSelectSuggestion(s: Suggestion) {
    setTitle(s.title)
    setSelectedMeta(s.meta ?? null)
    if (s.imageUrl) setSelectedImage(s.imageUrl)
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
      saveRecentSender(senderName)
      setSent(true)
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong')
      setSending(false)
    }
  }

  const [recoCount, setRecoCount] = useState(0)

  function addAnother() {
    // Reset form but keep sender name
    setCategory(null)
    setCustomCat('')
    setTitle('')
    setWhy('')
    setSelectedMeta(null)
    setSelectedImage(null)
    setError(null)
    setSent(false)
    setRecoCount(c => c + 1)
  }

  if (sent) {
    const firstName = senderName.trim()
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {!embedded && <><StatusBar /><NavHeader title="Instant Add" closeHref="/home" /></>}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-[24px] font-bold text-white tracking-[-0.6px] leading-[1.2] mb-2">Added. Nice one.</div>
            <div className="text-[15px] text-text-dim leading-[1.6]">
              {firstName}'s reco is in your feed.{recoCount > 0 && ` (${recoCount + 1} added)`}
            </div>
          </div>
          <button
            onClick={addAnother}
            className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold text-center"
          >
            Add another from {firstName}
          </button>
          <Link href="/home" className="text-[13px] text-text-faint underline underline-offset-2">
            Done — back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {!embedded && <><StatusBar /><NavHeader title="Instant Add" closeHref="/home" /></>}

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
        <div className="bg-bg-card border border-border rounded-card px-4 py-4">

          {/* Step 1: Who gave you this reco? */}
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">Who gave you this reco?</div>
          <input
            autoFocus
            className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
            placeholder="Their name..."
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
          />
          {/* Recent sender suggestions */}
          {!senderName.trim() && recentSenders.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 mb-4">
              {recentSenders.slice(0, 5).map((name) => (
                <button
                  key={name}
                  onClick={() => setSenderName(name)}
                  className="text-[12px] font-medium px-2.5 py-1 rounded-chip border border-border text-text-secondary hover:border-accent hover:text-accent transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
          {(senderName.trim() || recentSenders.length === 0) && <div className="mb-4" />}

          {/* Step 2: Category */}
          {senderName.trim().length > 0 && (
            <div className="anim-in">
              <div className="text-[20px] font-semibold text-white tracking-[-0.5px] leading-[1.1] mb-3">
                {category ? `What ${singular} did ${senderName.trim()} recommend?` : `What did ${senderName.trim()} recommend?`}
              </div>
              <CategoryChips
                category={category}
                customCat={customCat}
                onCategoryChange={setCategory}
                onCustomCatChange={setCustomCat}
              />
            </div>
          )}

          {/* Step 3: Name of the reco + autocomplete */}
          {category && (
            <div className="anim-in">
              <div className="border-t border-[#0e0e10] mb-4" />
              <AutocompleteInput
                category={category}
                value={title}
                onChange={handleTitleChange}
                onSelect={handleSelectSuggestion}
                placeholder={`Name of ${singular}...`}
                isVenue={isVenue}
                userLat={userLocation.current?.lat}
                userLng={userLocation.current?.lng}
              />
            </div>
          )}

          {/* Image preview + upload */}
          {title.trim().length > 0 && (
            <div className="anim-in mb-4">
              {selectedImage ? (
                <div className="relative rounded-xl overflow-hidden" style={{ height: 160 }}>
                  <img src={selectedImage} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <label className="px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-[11px] font-semibold text-white cursor-pointer">
                      Swap
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file || !userId) return
                        setSelectedImage(URL.createObjectURL(file))
                        const ext = file.name.split('.').pop() ?? 'jpg'
                        const path = `${userId}/${crypto.randomUUID()}.${ext}`
                        const form = new FormData()
                        form.append('file', file)
                        form.append('path', path)
                        const res = await fetch('/api/upload-image', { method: 'POST', body: form })
                        const data = await res.json()
                        if (data.publicUrl) setSelectedImage(data.publicUrl)
                      }} />
                    </label>
                    <button onClick={() => setSelectedImage(null)} className="px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-full text-[11px] font-semibold text-white">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3.5 py-3 border border-dashed border-border rounded-xl text-[12px] text-text-faint hover:border-accent hover:text-accent transition-colors cursor-pointer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                  </svg>
                  Add a photo
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file || !userId) return
                    setSelectedImage(URL.createObjectURL(file))
                    const ext = file.name.split('.').pop() ?? 'jpg'
                    const path = `${userId}/${crypto.randomUUID()}.${ext}`
                    const form = new FormData()
                    form.append('file', file)
                    form.append('path', path)
                    const res = await fetch('/api/upload-image', { method: 'POST', body: form })
                    const data = await res.json()
                    if (data.publicUrl) setSelectedImage(data.publicUrl)
                  }} />
                </label>
              )}
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
          {sending ? 'Adding...' : `Add ${senderName.trim() || ''}'s reco`}
        </button>
      </div>
    </div>
  )
}
