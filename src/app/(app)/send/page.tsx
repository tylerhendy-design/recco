'use client'

import { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { VoiceButton } from '@/components/ui/VoiceButton'
import { CATEGORIES, type CategoryId, getCategoryLabel } from '@/constants/categories'
import { createClient } from '@/lib/supabase/client'
import { fetchFriends } from '@/lib/data/friends'
import { sendReco } from '@/lib/data/recos'
import { initials } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Friend {
  id: string
  name: string
  username: string
  avatar_url: string | null
  selected: boolean
}

interface LinkMeta {
  type: 'music' | 'podcast' | 'place'
  title: string | null
  artist: string | null
  artworkUrl: string | null
  city: string | null
  country: string | null
  address: string | null
}

type ConstraintDef = { key: string; label: string; placeholder: string; icon: React.ReactNode }

// ─── Icons ───────────────────────────────────────────────────────────────────

const PIN = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
const MONEY = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v1.5m0 9V18m-2.5-8.5c0-1 .9-1.5 2.5-1.5s2.5.8 2.5 2c0 2.5-5 2-5 4.5 0 1.2 1.1 1.5 2.5 1.5s2.5-.4 2.5-1.5"/></svg>
const STAR = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
const TV = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
const MUSIC = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
const CLOCK = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
const FILM = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5"/></svg>
const BOOK = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
const CAM = <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M16 3l-4 4-4-4"/><circle cx="12" cy="14" r="3"/></svg>

// ─── Category-specific extra detail fields ───────────────────────────────────

const CONSTRAINTS: Record<string, ConstraintDef[]> = {
  restaurant: [
    { key: 'location', label: 'Location', placeholder: 'City / neighbourhood…', icon: PIN },
    { key: 'address', label: 'Address', placeholder: 'Street address…', icon: PIN },
    { key: 'occasion', label: 'Occasion', placeholder: 'e.g. date night, casual lunch…', icon: STAR },
    { key: 'price', label: 'Price range', placeholder: 'e.g. under £40, splurge…', icon: MONEY },
  ],
  tv: [
    { key: 'streaming', label: 'Streaming', placeholder: 'e.g. Netflix, HBO…', icon: TV },
    { key: 'genre', label: 'Genre', placeholder: 'e.g. thriller, comedy…', icon: FILM },
    { key: 'mood', label: 'Mood', placeholder: 'e.g. binge-worthy, light…', icon: STAR },
  ],
  podcast: [
    { key: 'topic', label: 'Topic', placeholder: 'e.g. true crime, business…', icon: MUSIC },
    { key: 'length', label: 'Episode length', placeholder: 'e.g. short, long-form…', icon: CLOCK },
    { key: 'mood', label: 'Mood', placeholder: 'e.g. educational, entertaining…', icon: STAR },
  ],
  music: [
    { key: 'genre', label: 'Genre', placeholder: 'e.g. indie, jazz, hip-hop…', icon: MUSIC },
    { key: 'mood', label: 'Mood', placeholder: 'e.g. workout, late night…', icon: STAR },
    { key: 'era', label: 'Era', placeholder: 'e.g. 90s, brand new, timeless…', icon: CLOCK },
  ],
  book: [
    { key: 'genre', label: 'Genre', placeholder: 'e.g. thriller, memoir…', icon: BOOK },
    { key: 'mood', label: 'Mood', placeholder: "e.g. can't put it down…", icon: STAR },
    { key: 'length', label: 'Length', placeholder: 'e.g. quick read, epic…', icon: CLOCK },
  ],
  film: [
    { key: 'genre', label: 'Genre', placeholder: 'e.g. horror, rom-com…', icon: FILM },
    { key: 'streaming', label: 'Streaming', placeholder: 'e.g. Netflix, cinema…', icon: TV },
    { key: 'era', label: 'Era', placeholder: 'e.g. classic, 90s, recent…', icon: CLOCK },
  ],
  default: [
    { key: 'vibes', label: 'Vibes', placeholder: 'e.g. cosy, lively, adventurous…', icon: STAR },
    { key: 'budget', label: 'Budget', placeholder: 'e.g. cheap and cheerful…', icon: MONEY },
    { key: 'location', label: 'Location', placeholder: 'e.g. central, near me…', icon: PIN },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isStreamingUrl(url: string) {
  return url.includes('spotify.com') || url.includes('music.apple.com') || url.includes('podcasts.apple.com')
}
function isMapsUrl(url: string) {
  return url.includes('google.com/maps') || url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GivePage() {
  return <Suspense><GivePageInner /></Suspense>
}

function GivePageInner() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('to')

  const [userId, setUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [friendSearch, setFriendSearch] = useState('')

  // Card fields
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [constraints, setConstraints] = useState<Record<string, string>>({})
  const [openConstraint, setOpenConstraint] = useState<string | null>(null)
  const [details, setDetails] = useState('')

  // Link auto-fill
  const [linkInput, setLinkInput] = useState('')
  const [linkMeta, setLinkMeta] = useState<LinkMeta | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)

  // Image
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const fetched = await fetchFriends(user.id)
      setFriends(fetched.map((f: any) => ({
        id: f.id, name: f.display_name, username: f.username,
        avatar_url: f.avatar_url, selected: f.id === preselectedId,
      })))
      setLoadingFriends(false)
    })
  }, [preselectedId])

  // Reset on category change
  useEffect(() => {
    setConstraints({})
    setOpenConstraint(null)
    setLinkInput('')
    setLinkMeta(null)
    setImageUrl(null)
    setTitle('')
  }, [category])

  function toggleFriend(id: string) {
    setFriends((prev) => prev.map((f) => f.id === id ? { ...f, selected: !f.selected } : f))
  }

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q))
  }, [friendSearch, friends])

  const allSelected = friends.length > 0 && friends.every((f) => f.selected)
  function toggleAll() {
    setFriends((prev) => prev.map((f) => ({ ...f, selected: !allSelected })))
  }

  // Link auto-fill
  async function fetchLinkMeta(url: string) {
    setLinkLoading(true)
    try {
      const res = await fetch(`/api/link-meta?url=${encodeURIComponent(url)}`)
      if (!res.ok) return
      const data: LinkMeta = await res.json()
      setLinkMeta(data)
      if (data.title && !title) setTitle(data.title)
      if (data.artworkUrl) setImageUrl(data.artworkUrl)
      // Pre-fill constraints from place data
      if (data.type === 'place') {
        const loc = [data.city, data.country].filter(Boolean).join(', ')
        if (loc) setConstraints((p) => ({ ...p, location: loc }))
        if (data.address) setConstraints((p) => ({ ...p, address: data.address! }))
      }
    } finally {
      setLinkLoading(false)
    }
  }

  function handleLinkChange(val: string) {
    setLinkInput(val)
    const trimmed = val.trim()
    if (isStreamingUrl(trimmed) || isMapsUrl(trimmed)) {
      fetchLinkMeta(trimmed)
    }
  }

  // Image upload
  async function handleImageFile(file: File) {
    if (!userId) return
    setImageUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('reco-images').upload(path, file, { contentType: file.type })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('reco-images').getPublicUrl(path)
        setImageUrl(publicUrl)
      }
    } finally {
      setImageUploading(false)
    }
  }

  const selectedFriends = friends.filter((f) => f.selected)
  const isRestaurant = category === 'restaurant'
  const isMediaCat = category === 'music' || category === 'podcast'
  const activeDefs: ConstraintDef[] = category && category !== 'custom'
    ? (CONSTRAINTS[category] ?? CONSTRAINTS.default)
    : CONSTRAINTS.default

  const hasGoogleMapsLink = linkInput.trim() && isMapsUrl(linkInput)
  const canSend = category !== null && title.trim().length > 0 && selectedFriends.length > 0 && !sending
    && (!isRestaurant || !!hasGoogleMapsLink)

  async function handleSend() {
    if (!canSend || !userId || !category) return
    setSending(true)
    setSendError(null)

    const finalCat = category === 'custom' ? 'custom' : category
    const finalCustomCat = category === 'custom' ? customCat.trim() : undefined

    const meta: Record<string, unknown> = {}
    if (imageUrl) meta.artwork_url = imageUrl
    if (linkMeta?.artist) meta.artist = linkMeta.artist
    if (constraints.location) meta.location = constraints.location
    if (constraints.address) meta.address = constraints.address
    if (constraints.streaming) meta.streaming_service = constraints.streaming

    const links: string[] = []
    if (linkInput.trim()) links.push(linkInput.trim())

    const { error } = await sendReco({
      senderId: userId,
      category: finalCat,
      customCat: finalCustomCat,
      title: title.trim(),
      whyText: why.trim() || undefined,
      links,
      meta,
      recipientIds: selectedFriends.map((f) => f.id),
    })

    if (error) { setSendError(error); setSending(false); return }
    setSent(true)
  }

  // ─── Success screen ────────────────────────────────────────────────────────
  if (sent) {
    const names = selectedFriends.map((f) => f.name.split(' ')[0])
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <StatusBar />
        <NavHeader title="give a reco" closeHref="/home" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-[24px] font-bold text-white tracking-[-0.6px] leading-[1.2] mb-2">Reco given. Good job.</div>
            <div className="text-[15px] text-text-dim leading-[1.6]">
              We hope {names.length === 1 ? names[0] : 'they'} love{names.length === 1 ? 's' : ''} it.
            </div>
          </div>
          <Link href="/home" className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold text-center mt-2">Back home</Link>
        </div>
      </div>
    )
  }

  // ─── Category chip title ──────────────────────────────────────────────────
  const SINGULAR: Record<string, string> = {
    restaurant: 'restaurant', tv: 'TV show', podcast: 'podcast',
    music: 'album or track', book: 'book', film: 'film', custom: customCat || 'thing',
  }
  const singular = category ? (SINGULAR[category] ?? getCategoryLabel(category).toLowerCase()) : ''

  const pageTitle = category ? `Reco ${singular}` : 'Reco'

  const displayedCats = CATEGORIES.filter((c) => c.id !== 'custom')

  // ─── Link input label ──────────────────────────────────────────────────────
  const linkPlaceholder = isRestaurant
    ? 'Paste Google Maps link to auto-fill…'
    : category === 'podcast'
      ? 'Paste Spotify or Apple Podcasts link…'
      : 'Paste Spotify or Apple Music link…'

  const linkService = linkMeta
    ? linkMeta.type === 'place' ? 'Google Maps' : linkMeta.artworkUrl ? 'Streaming' : null
    : null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="give a reco" closeHref="/home" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
        <div className="bg-bg-card border border-border rounded-card px-4 py-4">

          {/* ── Title ── */}
          <div className="text-[26px] font-semibold text-white tracking-[-0.7px] leading-[1.1] mb-4">
            {pageTitle}
          </div>

          {/* ── Category chips ── */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {displayedCats.map((cat) => {
              const active = category === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategory(active ? null : cat.id as CategoryId)}
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
            <button
              onClick={() => setCategory(category === 'custom' ? null : 'custom')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-chip transition-all text-[11px] font-semibold tracking-[0.4px] uppercase"
              style={category === 'custom'
                ? { color: '#D4E23A', border: '1px solid #D4E23A', background: 'rgba(212,226,58,0.08)' }
                : { color: '#555', border: '1px dashed #333' }
              }
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Custom
            </button>
          </div>
          {category === 'custom' && (
            <input
              autoFocus
              className="mb-4 w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#333] font-sans"
              placeholder="e.g. Architecture, Coffee, Barbers…"
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value)}
            />
          )}

          {/* ── Divider ── */}
          <div className="border-t border-[#0e0e10] mb-4" />

          {/* ── Link auto-fill (restaurant / music / podcast) ── */}
          {(isRestaurant || isMediaCat) && (
            <div className="mb-4">
              {/* Artwork preview for streaming */}
              {isMediaCat && imageUrl && (
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-[64px] h-[64px] rounded-xl overflow-hidden border border-border flex-shrink-0 relative">
                    <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => { setImageUrl(null); setLinkMeta(null); setLinkInput('') }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    {linkMeta?.title && <div className="text-[15px] font-semibold text-white leading-tight">{linkMeta.title}</div>}
                    {linkMeta?.artist && <div className="text-[12px] text-text-muted mt-0.5">{linkMeta.artist}</div>}
                  </div>
                </div>
              )}

              {/* Link input */}
              {(!linkMeta || !imageUrl) && (
                <div className={`flex items-center gap-2 rounded-input px-3 py-2.5 border ${
                  isRestaurant
                    ? 'bg-[#0e1a0a] border-[#2a6020]/40'
                    : 'bg-[#0a1a0e] border-[#1DB954]/30'
                }`}>
                  {isRestaurant ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954"><circle cx="12" cy="12" r="12"/><path d="M6 9.6C9.3 7.5 14.9 7.8 18 10l-.9 1.5C15 9.7 10.2 9.4 7.2 11.3L6 9.6zm-.5 3.3C9.8 10.3 16.6 10.7 20 13.5l-.9 1.4C16 12.3 9.9 12 6.7 14.3l-1.2-1.4zm1 3.2c3-2 8.1-1.7 11 .5l-.9 1.3c-2.5-1.9-7-2.1-9.6-.4l-.5-1.4z" fill="#0a1f0e"/></svg>
                  )}
                  <input
                    className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-[#444] font-sans"
                    placeholder={linkPlaceholder}
                    value={linkInput}
                    onChange={(e) => handleLinkChange(e.target.value)}
                  />
                  {linkLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin flex-shrink-0" />
                  )}
                </div>
              )}

              {/* Google Maps result preview */}
              {isRestaurant && linkMeta?.type === 'place' && (
                <div className="mt-2 px-3 py-2 bg-bg-base border border-border rounded-input">
                  <div className="text-[13px] font-semibold text-white">{linkMeta.title}</div>
                  {(linkMeta.city || linkMeta.country) && (
                    <div className="text-[12px] text-text-muted mt-0.5">
                      {[linkMeta.city, linkMeta.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                  {linkMeta.address && <div className="text-[11px] text-text-faint mt-0.5">{linkMeta.address}</div>}
                  <button
                    onClick={() => { setLinkMeta(null); setLinkInput(''); setTitle(''); setConstraints({}) }}
                    className="text-[11px] text-text-faint mt-1.5 hover:text-red-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Name input ── */}
          <input
            className="text-[26px] font-semibold text-white tracking-[-0.7px] leading-[1.05] w-full bg-transparent outline-none placeholder:text-[#2a2a30] font-sans mb-1"
            placeholder={category ? `Name of ${singular}…` : 'Name it…'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* ── Divider ── */}
          <div className="border-t border-[#0e0e10] mt-4 pt-4 mb-1">
            <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-0.5">Extra details</div>
            <div className="text-[12px] text-text-faint mb-3">Optional — more context makes a better reco</div>
          </div>

          {/* ── Constraint lozenges ── */}
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
                    ? { color: '#D4E23A', border: '1px solid #D4E23A55', background: 'rgba(212,226,58,0.08)' }
                    : { color: '#666', border: '1px dashed #2e2e33' }
                  }
                >
                  {def.icon}
                  {filled ? constraints[def.key] : `+ ${def.label}`}
                </button>
              )
            })}

            {/* Image lozenge */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-[12px] font-medium transition-all overflow-hidden"
              style={imageUrl
                ? { color: '#D4E23A', border: '1px solid #D4E23A55', background: 'rgba(212,226,58,0.08)' }
                : { color: '#666', border: '1px dashed #2e2e33' }
              }
            >
              {imageUploading ? (
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : imageUrl ? (
                <>
                  <img src={imageUrl} alt="" className="w-4 h-4 rounded object-cover flex-shrink-0" />
                  Photo added
                </>
              ) : (
                <>{CAM} + Photo</>
              )}
            </button>
          </div>

          {/* Expanded constraint input */}
          {openConstraint && (
            <div className="mb-2.5">
              <input
                autoFocus
                className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#333] font-sans"
                placeholder={activeDefs.find((d) => d.key === openConstraint)?.placeholder ?? ''}
                value={constraints[openConstraint] ?? ''}
                onChange={(e) => setConstraints((prev) => ({ ...prev, [openConstraint]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && setOpenConstraint(null)}
              />
            </div>
          )}

          {/* ── Why ── */}
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5 mt-3">Why?</div>
          <div className="flex gap-2.5 items-start mb-1">
            <VoiceButton />
            <textarea
              className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-[#2a2a30] font-sans resize-none leading-[1.5]"
              placeholder="Voice or type your reason…"
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-[#0e0e10] mt-4 mb-3" />

          {/* ── Send to ── */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase">Send to</div>
            {friends.length > 0 && (
              <button
                onClick={toggleAll}
                className={`text-[11px] font-semibold transition-colors ${allSelected ? 'text-accent' : 'text-text-faint hover:text-text-muted'}`}
              >
                {allSelected ? '− Deselect all' : '+ Send to everyone'}
              </button>
            )}
          </div>

          <div className="relative mb-2.5">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="w-full bg-bg-base border border-border rounded-input pl-7 pr-3 py-1.5 text-[12px] text-text-secondary outline-none placeholder:text-[#333] font-sans"
              placeholder="Search friends…"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>

          {/* Search results */}
          {friendSearch.trim().length > 0 && (
            <div className="flex flex-col gap-0.5 mb-2">
              {filteredFriends.filter((f) => !f.selected).length === 0 ? (
                <div className="text-[12px] text-text-faint px-2 py-1">No friends found.</div>
              ) : (
                filteredFriends.filter((f) => !f.selected).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { toggleFriend(f.id); setFriendSearch('') }}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-base transition-colors text-left w-full"
                  >
                    <div className="w-6 h-6 rounded-full bg-bg-base border border-border flex items-center justify-center text-[9px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                      {f.avatar_url ? <img src={f.avatar_url} alt={f.name} className="w-full h-full object-cover" /> : initials(f.name)}
                    </div>
                    <span className="text-[12px] font-medium text-text-secondary">{f.name}</span>
                    {f.username && <span className="text-[11px] text-text-faint">@{f.username}</span>}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected friends chips */}
          {selectedFriends.length > 0 && (
            <div className="flex flex-wrap gap-[5px] mb-1">
              {selectedFriends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFriend(f.id)}
                  className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-chip border transition-all"
                  style={{ color: '#D4E23A', borderColor: '#D4E23A', background: 'rgba(212,226,58,0.08)' }}
                >
                  {f.name.split(' ')[0]}
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              ))}
            </div>
          )}

          {loadingFriends && (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Error */}
        {sendError && <div className="mt-3 text-[13px] text-red-400 text-center">{sendError}</div>}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`mt-3 w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
            canSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          {sending ? 'Giving…' : 'Give reco'}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleImageFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
