'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { CATEGORIES, getCategoryLabel } from '@/constants/categories'
import { fetchFriends } from '@/lib/data/friends'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import Link from 'next/link'
import QRCode from 'qrcode'

type Friend = { id: string; display_name: string; username: string; avatar_url: string | null }

type ConstraintDef = {
  key: string
  label: string
  placeholder: string
  icon: React.ReactNode
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
    { key: 'location', label: 'Location', placeholder: 'e.g. Soho, within 30 min of me…', icon: PIN },
    { key: 'budget', label: 'Price range', placeholder: 'e.g. under £40, special occasion splurge…', icon: MONEY },
    { key: 'occasion', label: 'Occasion', placeholder: 'e.g. date night, casual lunch, group…', icon: STAR },
  ],
  tv: [
    { key: 'genre', label: 'Genre', placeholder: 'e.g. thriller, dark comedy, sci-fi…', icon: FILM },
    { key: 'streaming', label: 'Streaming', placeholder: 'e.g. Netflix, HBO, I have all of them…', icon: TV },
    { key: 'mood', label: 'Mood', placeholder: "e.g. something light, can't stop watching…", icon: STAR },
  ],
  podcast: [
    { key: 'topic', label: 'Topic', placeholder: 'e.g. true crime, business, history…', icon: MUSIC },
    { key: 'length', label: 'Episode length', placeholder: 'e.g. short commute, long runs…', icon: CLOCK },
    { key: 'mood', label: 'Mood', placeholder: 'e.g. educational, entertaining, chill…', icon: STAR },
  ],
  music: [
    { key: 'genre', label: 'Genre', placeholder: 'e.g. indie, jazz, hip-hop, anything…', icon: MUSIC },
    { key: 'mood', label: 'Mood', placeholder: 'e.g. workout, late night, focus…', icon: STAR },
    { key: 'era', label: 'Era', placeholder: 'e.g. 90s nostalgia, brand new, timeless…', icon: CLOCK },
  ],
  book: [
    { key: 'genre', label: 'Genre', placeholder: 'e.g. thriller, sci-fi, memoir, fiction…', icon: BOOK },
    { key: 'mood', label: 'Mood', placeholder: "e.g. can't put it down, slow burn…", icon: STAR },
    { key: 'length', label: 'Length', placeholder: 'e.g. quick read, I want a proper epic…', icon: CLOCK },
  ],
  film: [
    { key: 'genre', label: 'Genre', placeholder: 'e.g. horror, rom-com, documentary…', icon: FILM },
    { key: 'streaming', label: 'Streaming', placeholder: "e.g. Netflix, cinema, doesn't matter…", icon: TV },
    { key: 'era', label: 'Era', placeholder: 'e.g. classic, 90s, something recent…', icon: CLOCK },
  ],
  default: [
    { key: 'vibes', label: 'Vibes', placeholder: 'e.g. cosy, lively, adventurous…', icon: STAR },
    { key: 'budget', label: 'Budget', placeholder: 'e.g. cheap and cheerful, no limit…', icon: MONEY },
    { key: 'location', label: 'Location', placeholder: "e.g. central, near me, doesn't matter…", icon: PIN },
  ],
}

export default function GetPage() {
  return <Suspense><GetPageInner /></Suspense>
}

function GetPageInner() {
  const searchParams = useSearchParams()
  const preselectedFrom = searchParams.get('from')

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedFrom ? [preselectedFrom] : [])
  const [friendSearch, setFriendSearch] = useState('')
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

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) =>
      f.display_name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
    )
  }, [friends, friendSearch])

  const allSelected = friends.length > 0 && selectedIds.length === friends.length

  function togglePerson(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : friends.map((f) => f.id))
  }

  const displayedCats = CATEGORIES.filter((c) => c.id !== 'custom')
  const canSend = selectedIds.length > 0

  async function handleSend() {
    if (!canSend || !userId || sending) return
    setSending(true)
    const supabase = createClient()
    const effectiveCat = selectedCat === 'custom' ? (customCat.trim() || null) : selectedCat
    const payload = {
      category: effectiveCat,
      count: recoCount,
      constraints: Object.fromEntries(Object.entries(constraints).filter(([, v]) => v.trim())),
      details: details.trim() || null,
    }

    // Save a shareable request record via API (bypasses RLS)
    try {
      const res = await fetch('/api/share-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: effectiveCat, payload }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.id) setRequestId(data.id)
      }
    } catch (e) {
      console.error('share-request failed:', e)
    }

    // Send notifications to selected friends
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
    setSending(false)
    setSent(true)
  }

  if (sent) {
    const effectiveCat = selectedCat === 'custom' ? (customCat.trim() || null) : selectedCat
    const shareUrl = requestId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/r/request/${requestId}` : null
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <StatusBar />
        <NavHeader title="Get a reco" closeHref="/home" />
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
              Request sent to {allSelected ? 'all your friends' : selectedIds.length === 1 ? friends.find((f) => f.id === selectedIds[0])?.display_name.split(' ')[0] : `${selectedIds.length} people`}.
            </div>
          </div>

          {/* Share externally */}
          {shareUrl && <ShareRequest url={shareUrl} category={effectiveCat} />}

          <Link href="/home" className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold text-center mt-2">
            Back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="Get a reco" closeHref="/home" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
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
                  <span className="font-semibold">Getting a reco from {friend.display_name.split(' ')[0]}</span>
                </div>
              </div>
            ) : null
          })()}

          {/* Static title */}
          <div className="text-[26px] font-semibold text-white tracking-[-0.7px] leading-[1.1] mb-4">
            What are you after?
          </div>

          {/* Category chips */}
          <div className="mb-4">
            <div className="flex gap-1.5 flex-wrap">
              {displayedCats.map((cat) => {
                const active = selectedCat === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(active ? null : cat.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-chip border transition-all text-[11px] font-semibold tracking-[0.4px] uppercase"
                    style={active
                      ? { color: cat.color, borderColor: cat.color, background: cat.bgColor }
                      : { color: '#444', borderColor: '#222226' }
                    }
                  >
                    <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: active ? cat.color : '#444' }} />
                    {cat.label}
                  </button>
                )
              })}
              {/* Custom — dotted border, custom icon */}
              <button
                onClick={() => setSelectedCat(selectedCat === 'custom' ? null : 'custom')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-chip transition-all text-[11px] font-semibold tracking-[0.4px] uppercase"
                style={selectedCat === 'custom'
                  ? { color: '#D4E23A', border: '1px solid #D4E23A', background: 'rgba(212,226,58,0.08)' }
                  : { color: '#555', border: '1px dashed #333' }
                }
              >
                {/* Pencil/custom icon */}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Custom
              </button>
            </div>
            {selectedCat === 'custom' && (
              <input
                autoFocus
                className="mt-2.5 w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
                placeholder="e.g. Architecture, Coffee, Barbers…"
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
              />
            )}
          </div>

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
                  </button>
                )
              })}
            </div>

            {/* Expanded input */}
            {openConstraint && (
              <div className="mb-2.5">
                <input
                  autoFocus
                  className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
                  placeholder={activeDefs.find((d) => d.key === openConstraint)?.placeholder ?? ''}
                  value={constraints[openConstraint] ?? ''}
                  onChange={(e) => setConstraints((prev) => ({ ...prev, [openConstraint]: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && setOpenConstraint(null)}
                />
              </div>
            )}

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
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase">Ask</div>
            {friends.length > 0 && (
              <button
                onClick={toggleAll}
                className={`text-[11px] font-semibold transition-colors ${allSelected ? 'text-accent' : 'text-text-faint hover:text-text-muted'}`}
              >
                {allSelected ? '− Deselect all' : '+ Ask everyone'}
              </button>
            )}
          </div>

          <div className="relative mb-2.5">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="w-full bg-bg-card border border-border rounded-input pl-7 pr-3 py-3 text-[14px] text-white outline-none placeholder:text-[#444] focus:border-accent font-sans"
              placeholder="Search friends…"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>

          {/* Search results — show when typing */}
          {friendSearch.trim().length > 0 && (
            <div className="flex flex-col gap-0.5 mb-2">
              {filteredFriends.filter((f) => !selectedIds.includes(f.id)).length === 0 ? (
                <div className="text-[12px] text-text-faint px-2 py-1">No friends found.</div>
              ) : (
                filteredFriends.filter((f) => !selectedIds.includes(f.id)).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { togglePerson(f.id); setFriendSearch('') }}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-base transition-colors text-left w-full"
                  >
                    <div className="w-6 h-6 rounded-full bg-bg-base border border-border flex items-center justify-center text-[9px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                        : initials(f.display_name)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-medium text-text-secondary">{f.display_name}</span>
                      {f.username && <span className="text-[11px] text-text-faint ml-1.5">@{f.username}</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-[5px] mb-2">
              {selectedIds.map((id) => {
                const f = friends.find((fr) => fr.id === id)
                if (!f) return null
                return (
                  <button
                    key={id}
                    onClick={() => togglePerson(id)}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-chip border transition-all"
                    style={{ color: '#D4E23A', borderColor: '#D4E23A', background: 'rgba(212,226,58,0.08)' }}
                  >
                    {f.display_name.split(' ')[0]}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )
              })}
            </div>
          )}
          </>}
        </div>

        <button
          onClick={handleSend}
          disabled={!canSend || sending}
          className={`mt-3 w-full py-[15px] rounded-btn text-[15px] font-bold text-center transition-all ${
            canSend && !sending ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          {sending ? 'Sending…' : 'Request reco'}
        </button>
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
