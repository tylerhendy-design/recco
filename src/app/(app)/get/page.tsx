'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { type CategoryId, getCategoryLabel } from '@/constants/categories'
import { CategoryChips } from '@/components/ui/CategoryChips'
import { FriendPicker, type PickableFriend } from '@/components/ui/FriendPicker'
import { fetchFriends } from '@/lib/data/friends'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import QRCode from 'qrcode'


type ConstraintDef = {
  key: string
  label: string
  placeholder: string
  icon: React.ReactNode
  presets?: string[]
}

const PIN = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
const MONEY = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v1.5m0 9V18m-2.5-8.5c0-1 .9-1.5 2.5-1.5s2.5.8 2.5 2c0 2.5-5 2-5 4.5 0 1.2 1.1 1.5 2.5 1.5s2.5-.4 2.5-1.5"/></svg>
const STAR = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
const TV = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
const MUSIC = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
const CLOCK = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
const FILM = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5"/></svg>
const BOOK = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>

const CATEGORY_CONSTRAINTS: Record<string, ConstraintDef[]> = {
  restaurant: [
    { key: 'cuisine', label: 'Cuisine', placeholder: 'Type a cuisine…', icon: STAR, presets: ['Italian', 'Japanese', 'Mexican', 'Indian', 'Thai', 'French', 'Chinese', 'Korean', 'Mediterranean', 'Local'] },
    { key: 'vibe', label: 'Vibe', placeholder: 'Type a vibe…', icon: STAR, presets: ['Candlelit', 'Buzzy', 'Hole in the wall', 'Fine dining', 'Casual', 'Outdoor', 'Cosy', 'Lively'] },
    { key: 'budget', label: 'Budget', placeholder: 'Type a budget…', icon: MONEY, presets: ['Under £20pp', '£20-40pp', '£40-80pp', 'Splurge', 'No budget'] },
    { key: 'group_size', label: 'Group size', placeholder: 'Type group size…', icon: STAR, presets: ['Solo', 'Date', 'Small group', 'Big group', 'Family'] },
    { key: 'booking', label: 'Reservations', placeholder: 'Type preference…', icon: CLOCK, presets: ['Walk-in only', 'Need to book', 'Flexible'] },
    { key: 'duration', label: 'How long', placeholder: 'Type duration…', icon: CLOCK, presets: ['Quick bite', 'Long lunch', '3-hour dinner', 'All evening'] },
    { key: 'avoid', label: 'Avoid', placeholder: 'Type what to avoid…', icon: STAR, presets: ['Tourist traps', 'Chains', 'Too fancy', 'Too loud', 'No spice'] },
    { key: 'location', label: 'Location', placeholder: 'Type a location…', icon: PIN },
  ],
  bars: [
    { key: 'vibe', label: 'Vibe', placeholder: 'Type a vibe…', icon: STAR, presets: ['Speakeasy', 'Rooftop', 'Dive bar', 'Cocktail bar', 'Wine bar', 'Pub', 'Beer garden'] },
    { key: 'budget', label: 'Budget', placeholder: 'Type a budget…', icon: MONEY, presets: ['Cheap', 'Mid-range', 'Fancy', 'No budget'] },
    { key: 'group_size', label: 'Group size', placeholder: 'Type group size…', icon: STAR, presets: ['Date', 'Small group', 'Big night', 'Solo'] },
    { key: 'location', label: 'Location', placeholder: 'Type a location…', icon: PIN },
  ],
  tv: [
    { key: 'genre', label: 'Genre', placeholder: 'Type a genre…', icon: FILM, presets: ['Thriller', 'Comedy', 'Drama', 'Sci-fi', 'True crime', 'Reality', 'Documentary', 'Horror'] },
    { key: 'mood', label: 'Mood', placeholder: 'Type a mood…', icon: STAR, presets: ['Binge-worthy', 'Light', 'Intense', 'Feel-good', 'Mind-bending', 'Slow burn'] },
    { key: 'streaming', label: 'Streaming', placeholder: 'Type a service…', icon: TV, presets: ['Netflix', 'HBO', 'Prime', 'Apple TV+', 'Disney+', 'Any'] },
    { key: 'length', label: 'Length', placeholder: 'Type preference…', icon: CLOCK, presets: ['Short series', 'Long-running', 'Limited series', 'Any'] },
  ],
  podcast: [
    { key: 'topic', label: 'Topic', placeholder: 'Type a topic…', icon: MUSIC, presets: ['True crime', 'Business', 'Comedy', 'History', 'Science', 'Culture', 'Sport', 'Politics'] },
    { key: 'mood', label: 'Mood', placeholder: 'Type a mood…', icon: STAR, presets: ['Educational', 'Entertaining', 'Gripping', 'Chill', 'Funny', 'Inspiring'] },
    { key: 'length', label: 'Length', placeholder: 'Type a length…', icon: CLOCK, presets: ['Under 30 mins', '30-60 mins', '1 hour+', 'Any'] },
    { key: 'context', label: 'For', placeholder: 'Type context…', icon: STAR, presets: ['Commute', 'Long drive', 'Gym', 'Cooking', 'Before bed', 'Background'] },
  ],
  music: [
    { key: 'genre', label: 'Genre', placeholder: 'Type a genre…', icon: MUSIC, presets: ['Indie', 'Jazz', 'Hip-hop', 'Electronic', 'Rock', 'R&B', 'Classical', 'Pop'] },
    { key: 'mood', label: 'Mood', placeholder: 'Type a mood…', icon: STAR, presets: ['Workout', 'Late night', 'Focus', 'Dinner party', 'Road trip', 'Chill'] },
    { key: 'era', label: 'Era', placeholder: 'Type an era…', icon: CLOCK, presets: ['Brand new', '2010s', '2000s', '90s', '80s', 'Timeless'] },
  ],
  book: [
    { key: 'genre', label: 'Genre', placeholder: 'Type a genre…', icon: BOOK, presets: ['Thriller', 'Sci-fi', 'Memoir', 'Literary fiction', 'Fantasy', 'Non-fiction', 'Self-help'] },
    { key: 'mood', label: 'Mood', placeholder: 'Type a mood…', icon: STAR, presets: ["Can't put down", 'Slow burn', 'Mind-bending', 'Feel-good', 'Emotional', 'Funny'] },
    { key: 'length', label: 'Length', placeholder: 'Type a length…', icon: CLOCK, presets: ['Quick read', 'Medium', 'Epic', 'Audiobook friendly'] },
  ],
  film: [
    { key: 'genre', label: 'Genre', placeholder: 'Type a genre…', icon: FILM, presets: ['Horror', 'Rom-com', 'Documentary', 'Action', 'Drama', 'Sci-fi', 'Foreign', 'Animated'] },
    { key: 'mood', label: 'Mood', placeholder: 'Type a mood…', icon: STAR, presets: ['Feel-good', 'Intense', 'Make me think', 'Make me cry', 'Escapism', 'Funny'] },
    { key: 'streaming', label: 'Where', placeholder: 'Type where…', icon: TV, presets: ['Netflix', 'Cinema', 'Prime', 'Apple TV+', 'Any'] },
    { key: 'watching_with', label: 'With', placeholder: 'Type who…', icon: STAR, presets: ['Partner', 'Family', 'Alone', 'Mates', 'Kids'] },
  ],
  culture: [
    { key: 'type', label: 'Type', placeholder: 'Type what…', icon: STAR, presets: ['Gallery', 'Museum', 'Theatre', 'Market', 'Live music', 'Festival', 'Walking tour'] },
    { key: 'vibe', label: 'Vibe', placeholder: 'Type a vibe…', icon: STAR, presets: ['Rainy day', 'Date', 'Family-friendly', 'Nerdy', 'Chill', 'Instagram-worthy'] },
    { key: 'budget', label: 'Budget', placeholder: 'Type a budget…', icon: MONEY, presets: ['Free', 'Under £20', 'Splash out', 'Any'] },
    { key: 'location', label: 'Location', placeholder: 'Type a location…', icon: PIN },
  ],
  default: [
    { key: 'vibes', label: 'Vibes', placeholder: 'Type vibes…', icon: STAR, presets: ['Cosy', 'Lively', 'Adventurous', 'Relaxed', 'Romantic'] },
    { key: 'budget', label: 'Budget', placeholder: 'Type a budget…', icon: MONEY, presets: ['Cheap', 'Mid-range', 'Splurge', 'Free'] },
    { key: 'location', label: 'Location', placeholder: 'Type a location…', icon: PIN },
    { key: 'context', label: 'Context', placeholder: 'Type context…', icon: STAR, presets: ['Travelling', 'Date night', 'Solo', 'Group', 'Weekend'] },
  ],
}

export default function GetPage() {
  return <Suspense><GetPageInner /></Suspense>
}

export function GetPageInner({ embedded }: { embedded?: boolean } = {}) {
  const searchParams = useSearchParams()
  const preselectedFrom = searchParams.get('from')

  const [selectedCat, setSelectedCat] = useState<CategoryId | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [friends, setFriends] = useState<PickableFriend[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedFrom ? [preselectedFrom] : [])
  const [constraints, setConstraints] = useState<Record<string, string>>({})
  const [openConstraint, setOpenConstraint] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [recoCount, setRecoCount] = useState(1)
  const [requestId, setRequestId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const data = await fetchFriends(user.id)
      setFriends(data as Friend[])
    })
  }, [])

  // Reset constraints when category changes
  useEffect(() => {
    setConstraints({})
    setOpenConstraint(null)
  }, [selectedCat])

  const activeDefs: ConstraintDef[] = selectedCat && selectedCat !== 'custom'
    ? (CATEGORY_CONSTRAINTS[selectedCat] ?? CATEGORY_CONSTRAINTS.default)
    : CATEGORY_CONSTRAINTS.default

  const allSelected = friends.length > 0 && selectedIds.length === friends.length

  function togglePerson(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : friends.map((f) => f.id))
  }

  const canSend = selectedIds.length > 0
  const hasRequest = selectedCat !== null

  async function createShareableRequest(): Promise<string | null> {
    if (!userId) return null
    const effectiveCat = selectedCat === 'custom' ? (customCat.trim() || null) : selectedCat
    const payload = {
      category: effectiveCat,
      count: recoCount,
      constraints: Object.fromEntries(Object.entries(constraints).filter(([, v]) => v.trim())),
      details: details.trim() || null,
    }
    try {
      const res = await fetch('/api/share-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: effectiveCat, payload }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.id) { setRequestId(data.id); return data.id }
      }
    } catch (e) {
      console.error('share-request failed:', e)
    }
    return null
  }

  async function handleSend() {
    if (!userId || sending) return
    setSending(true)

    // Always create a shareable record
    await createShareableRequest()

    // Send notifications to selected friends (if any)
    if (selectedIds.length > 0) {
      const supabase = createClient()
      const effectiveCat = selectedCat === 'custom' ? (customCat.trim() || null) : selectedCat
      const payload = {
        category: effectiveCat,
        count: recoCount,
        constraints: Object.fromEntries(Object.entries(constraints).filter(([, v]) => v.trim())),
        details: details.trim() || null,
      }
      await Promise.all(
        selectedIds.map((friendId) =>
          (supabase.from('notifications') as any).insert({
            user_id: friendId,
            type: 'request_received',
            actor_id: userId,
            payload,
          })
        )
      )
    }
    setSending(false)
    setSent(true)
  }

  if (sent) {
    const effectiveCat = selectedCat === 'custom' ? (customCat.trim() || null) : selectedCat
    const shareUrl = requestId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/request/${requestId}` : null
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {!embedded && <><StatusBar /><NavHeader title="Get a reco" closeHref="/home" /></>}
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
              {selectedIds.length > 0
                ? `Request sent to ${allSelected ? 'all your friends' : selectedIds.length === 1 ? friends.find((f) => f.id === selectedIds[0])?.display_name : `${selectedIds.length} people`}.`
                : 'Your request is ready to share.'}
            </div>
          </div>

          {/* Share externally */}
          {shareUrl && <ShareRequest url={shareUrl} category={effectiveCat} />}

          <Link href="/home" className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold text-center mt-2">
            Back home
          </Link>
          <Link href="/get/requests" className="text-[13px] text-text-faint underline underline-offset-2 mt-1">
            View your past requests
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {!embedded && <><StatusBar /><NavHeader title="Get a reco" closeHref="/home" /></>}

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
        <Link href="/get/requests" className="flex items-center justify-between px-4 py-3 bg-bg-card border border-border rounded-card mb-3">
          <span className="text-[13px] text-text-secondary font-medium">Your past requests</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </Link>

        <div className="bg-bg-card border border-border rounded-card px-4 py-4">

          {/* Pre-selected friend banner */}
          {preselectedFrom && (() => {
            const friend = friends.find(f => f.id === preselectedFrom)
            return friend ? (
              <div className="flex items-center gap-3 px-3 py-2.5 mb-4 rounded-xl bg-accent/8 border border-accent/20">
                <div className="w-8 h-8 rounded-full bg-bg-base border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                  {friend.avatar_url
                    ? <img src={friend.avatar_url} alt={friend.display_name} className="w-full h-full object-cover" />
                    : initials(friend.display_name)
                  }
                </div>
                <div className="text-[13px] text-accent leading-[1.4]">
                  <span className="font-semibold">Getting a reco from {friend.display_name}</span>
                </div>
              </div>
            ) : null
          })()}

          {/* Static title */}
          <div className="text-[26px] font-semibold text-white tracking-[-0.7px] leading-[1.1] mb-4">
            What are you after?
          </div>

          {/* Category chips */}
          <CategoryChips
            category={selectedCat}
            customCat={customCat}
            onCategoryChange={setSelectedCat}
            onCustomCatChange={setCustomCat}
          />

          {/* How many */}
          <div className="border-t border-[#0e0e10] pt-4 mb-4">
            <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">How many recos?</div>
            <div className="flex gap-2">
              {[1, 2, 3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRecoCount(n)}
                  className={`flex-1 py-2.5 rounded-lg text-[14px] font-bold transition-all ${
                    recoCount === n
                      ? 'bg-accent text-accent-fg'
                      : 'bg-[#1a1a1e] text-[#888]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Extra details section */}
          <div className="border-t border-[#0e0e10] pt-4 mb-3">
            <div className="mb-1">
              <div className="text-[17px] font-semibold text-white tracking-[-0.3px]">Extra details</div>
              <div className="text-[12px] text-text-faint mt-0.5">Optional — the more context, the better the reco</div>
            </div>

            {/* Category-specific lozenges */}
            <div className="flex gap-2 flex-wrap mb-2.5">
              {activeDefs.map((def) => {
                const filled = (constraints[def.key] ?? '').trim().length > 0
                const isOpen = openConstraint === def.key
                return (
                  <button
                    key={def.key}
                    onClick={() => setOpenConstraint(isOpen ? null : def.key)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-[12px] font-medium transition-all"
                    style={filled || isOpen
                      ? { color: '#D4E23A', borderColor: '#D4E23A55', background: 'rgba(212,226,58,0.08)', border: '1px solid #D4E23A55' }
                      : { color: '#666', borderColor: '#252528', background: 'transparent', border: '1px dashed #2e2e33' }
                    }
                  >
                    {def.icon}
                    {filled ? constraints[def.key] : `+ ${def.label}`}
                    {filled && (
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                        onClick={(e) => { e.stopPropagation(); setConstraints(prev => { const n = { ...prev }; delete n[def.key]; return n }); setOpenConstraint(null) }}
                      ><path d="M18 6L6 18M6 6l12 12"/></svg>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Expanded: preset chips + type your own */}
            {openConstraint && (() => {
              const def = activeDefs.find((d) => d.key === openConstraint)
              if (!def) return null
              const presets = def.presets ?? []
              const currentVal = constraints[openConstraint] ?? ''
              return (
                <div className="mb-2.5 bg-bg-base border border-border rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] mb-2">{def.label}</div>
                  {presets.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-2">
                      {presets.map((preset) => {
                        const active = currentVal.toLowerCase() === preset.toLowerCase()
                        return (
                          <button
                            key={preset}
                            onClick={() => {
                              setConstraints(prev => ({ ...prev, [openConstraint]: active ? '' : preset }))
                              if (!active) setOpenConstraint(null)
                            }}
                            className={`px-2.5 py-1.5 rounded-chip text-[12px] font-medium transition-all ${
                              active ? 'bg-accent text-accent-fg' : 'bg-bg-card border border-border text-text-secondary'
                            }`}
                          >
                            {preset}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <input
                    autoFocus={presets.length === 0}
                    className="w-full bg-bg-card border border-border rounded-input px-3 py-2.5 text-[13px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
                    placeholder={def.placeholder}
                    value={currentVal}
                    onChange={(e) => setConstraints(prev => ({ ...prev, [openConstraint]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && setOpenConstraint(null)}
                  />
                </div>
              )
            })()}

            {/* Free text details */}
            <div className="mt-4">
              <textarea
                rows={1}
                className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[44px]"
                placeholder="Anything else — where you'll be, what you've already tried, how picky you are…"
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value)
                  const el = e.target
                  el.style.height = 'auto'
                  el.style.height = `${el.scrollHeight}px`
                }}
              />
            </div>
          </div>

          {/* Ask section — hidden when pre-selected from friend profile */}
          {!preselectedFrom && <>
          <div className="border-t border-[#0e0e10] mb-3" />
          <FriendPicker
            friends={friends}
            selectedIds={selectedIds}
            onToggle={togglePerson}
            onToggleAll={toggleAll}
            allSelected={allSelected}
            label="Ask"
          />
          </>}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {canSend && (
            <button
              onClick={handleSend}
              disabled={sending}
              className={`w-full py-[15px] rounded-btn text-[15px] font-bold text-center transition-all ${
                !sending ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
              }`}
            >
              {sending ? 'Sending…' : `Request reco${selectedIds.length > 0 ? '' : ''}`}
            </button>
          )}
          {hasRequest && !canSend && (
            <button
              onClick={handleSend}
              disabled={sending}
              className={`w-full py-[15px] rounded-btn text-[15px] font-bold text-center transition-all ${
                !sending ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
              }`}
            >
              {sending ? 'Creating…' : 'Share request externally'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ShareRequest({ url, category }: { url: string; category: string | null }) {
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (showQR && !qrDataUrl) {
      QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: { dark: '#0c0c0e', light: '#ffffff' },
      }).then(setQrDataUrl)
    }
  }, [showQR, url, qrDataUrl])

  async function handleShare() {
    const shareText = category
      ? `I'm looking for a ${category} recommendation. Got one for me?`
      : `I'm looking for a recommendation. Got one for me?`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'RECO — Give me a reco', text: shareText, url })
        return
      } catch {}
    }
    // Fallback: copy to clipboard
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full">
      <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">Know someone not on RECO?</div>
      <div className="flex gap-2">
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 py-3 border border-border rounded-input text-[13px] font-semibold text-text-secondary hover:border-accent hover:text-accent transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          {copied ? 'Link copied' : 'Share link'}
        </button>
        <button
          onClick={() => setShowQR(!showQR)}
          className={`px-4 py-3 border rounded-input text-[13px] font-semibold transition-colors ${showQR ? 'border-accent text-accent' : 'border-border text-text-secondary hover:border-accent hover:text-accent'}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/><rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="4" height="4"/><rect x="20" y="14" width="2" height="2"/><rect x="14" y="20" width="2" height="2"/><rect x="20" y="20" width="2" height="2"/>
          </svg>
        </button>
      </div>
      {showQR && (
        <div className="mt-3 flex flex-col items-center">
          <div className="w-[180px] h-[180px] bg-white rounded-xl flex items-center justify-center mb-2">
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR code" width={180} height={180} className="rounded-xl" />
              : <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            }
          </div>
          <div className="text-[11px] text-text-faint">Scan to see your request and send a reco</div>
        </div>
      )}
    </div>
  )
}
