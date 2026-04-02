'use client'

import { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { VoiceButton, type VoiceResult } from '@/components/ui/VoiceButton'
import { CATEGORIES, type CategoryId, getCategoryLabel, getCategoryColor, getCategoryBg } from '@/constants/categories'
import { CategoryChips } from '@/components/ui/CategoryChips'
import { AutocompleteInput, type Suggestion } from '@/components/ui/AutocompleteInput'
import { createClient } from '@/lib/supabase/client'
import { fetchFriends } from '@/lib/data/friends'
import { sendReco, checkDuplicateReco } from '@/lib/data/recos'
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
const MONEY = <span className="text-[10px] font-bold leading-none">£</span>
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
    { key: 'price', label: 'Price range', placeholder: 'e.g. under 40pp, splurge…', icon: MONEY },
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
  bars: [
    { key: 'location', label: 'Location', placeholder: 'City / neighbourhood…', icon: PIN },
    { key: 'address', label: 'Address', placeholder: 'Street address…', icon: PIN },
    { key: 'occasion', label: 'Occasion', placeholder: 'e.g. after work, date…', icon: STAR },
    { key: 'price', label: 'Price range', placeholder: 'e.g. cheap, mid, pricey…', icon: MONEY },
  ],
  clubs: [
    { key: 'location', label: 'Location', placeholder: 'City / neighbourhood…', icon: PIN },
    { key: 'music_type', label: 'Music', placeholder: 'e.g. house, techno, R&B…', icon: MUSIC },
    { key: 'occasion', label: 'Occasion', placeholder: 'e.g. big night, chill…', icon: STAR },
  ],
  cocktails: [
    { key: 'location', label: 'Location', placeholder: 'City / neighbourhood…', icon: PIN },
    { key: 'address', label: 'Address', placeholder: 'Street address…', icon: PIN },
    { key: 'occasion', label: 'Occasion', placeholder: 'e.g. date night, celebration…', icon: STAR },
    { key: 'price', label: 'Price range', placeholder: 'e.g. under £15 a drink…', icon: MONEY },
  ],
  culture: [
    { key: 'type', label: 'Type', placeholder: 'e.g. gallery, museum, theatre…', icon: STAR },
    { key: 'location', label: 'Location', placeholder: 'City / neighbourhood…', icon: PIN },
    { key: 'price', label: 'Price', placeholder: 'e.g. free, under £20…', icon: MONEY },
  ],
  pubs: [
    { key: 'location', label: 'Location', placeholder: 'City / neighbourhood…', icon: PIN },
    { key: 'address', label: 'Address', placeholder: 'Street address…', icon: PIN },
    { key: 'occasion', label: 'Occasion', placeholder: 'e.g. Sunday roast, beer garden…', icon: STAR },
  ],
  wine_bars: [
    { key: 'location', label: 'Location', placeholder: 'City / neighbourhood…', icon: PIN },
    { key: 'address', label: 'Address', placeholder: 'Street address…', icon: PIN },
    { key: 'occasion', label: 'Occasion', placeholder: 'e.g. date, after work…', icon: STAR },
    { key: 'price', label: 'Price range', placeholder: 'e.g. natural wine, splurge…', icon: MONEY },
  ],
  default: [
    { key: 'vibes', label: 'Vibes', placeholder: 'e.g. cosy, lively, adventurous…', icon: STAR },
    { key: 'budget', label: 'Budget', placeholder: 'e.g. cheap and cheerful…', icon: MONEY },
    { key: 'location', label: 'Location', placeholder: 'e.g. central, near me…', icon: PIN },
  ],
}

// ─── Helpers ─────────────────────────────────────────────────────────────────


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GivePage() {
  return <Suspense><GivePageInner /></Suspense>
}

export function GivePageInner({ embedded }: { embedded?: boolean } = {}) {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('to')
  const sendContext = searchParams.get('context')
  const isForward = searchParams.get('forward') === 'true'
  const forwardCategory = searchParams.get('category') as CategoryId | null
  const forwardTitle = searchParams.get('title')
  const forwardImage = searchParams.get('image')
  const forwardWhy = searchParams.get('why')
  const forwardFrom = searchParams.get('from')
  const originalSenderId = searchParams.get('originalSenderId')

  const [userId, setUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [friendSearch, setFriendSearch] = useState('')

  // Card fields
  const [category, setCategory] = useState<CategoryId | null>(forwardCategory)
  const [customCat, setCustomCat] = useState('')
  const [title, setTitle] = useState(forwardTitle ?? '')
  const [why, setWhy] = useState('')
  const [constraints, setConstraints] = useState<Record<string, string>>({})
  const [openConstraint, setOpenConstraint] = useState<string | null>(null)

  // Link auto-fill
  const [linkInput, setLinkInput] = useState('')
  const [linkMeta, setLinkMeta] = useState<LinkMeta | null>(null)
  const [linkLoading, setLinkLoading] = useState(false)

  // Image
  const [imageUrl, setImageUrl] = useState<string | null>(forwardImage ?? null)         // displayed URL (local blob or uploaded)
  const [imageUploaded, setImageUploaded] = useState(false)              // true = stored in Supabase
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showLinkInput, setShowLinkInput] = useState(false)
  const [sending, setSending] = useState(false)
  const [top03Dismissed, setTop03Dismissed] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [dupeWarning, setDupeWarning] = useState<string | null>(null)
  const [dupeConfirmed, setDupeConfirmed] = useState(false)
  const whyRef = useRef<HTMLTextAreaElement>(null)

  // Title autocomplete (managed by AutocompleteInput, these are post-selection state)
  const [manualArtist, setManualArtist] = useState('')
  const [suggestionSelected, setSuggestionSelected] = useState(false)
  const userLocation = useRef<{ lat: number; lng: number } | null>(null)

  // Custom constraint tabs
  const [customConstraintDefs, setCustomConstraintDefs] = useState<ConstraintDef[]>([])
  const [addingCustomConstraint, setAddingCustomConstraint] = useState(false)
  const [customConstraintInput, setCustomConstraintInput] = useState('')

  // Voice note
  const [voiceResult, setVoiceResult] = useState<VoiceResult | null>(null)

  // TOP 03 gate
  const [picksCount, setPicksCount] = useState<number | null>(null)
  const [hasCompleteCategory, setHasCompleteCategory] = useState(false)
  const [totalRecosSent, setTotalRecosSent] = useState(0)

  // Request geolocation once on mount — used to bias restaurant search
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => { userLocation.current = { lat: pos.coords.latitude, lng: pos.coords.longitude } },
      () => { userLocation.current = { lat: 51.5074, lng: -0.1278 } } // fallback: London
    )
  }, [])

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const [fetched, { data: picksData }, { count: sentCount }] = await Promise.all([
        fetchFriends(user.id),
        createClient().from('profile_picks').select('category').eq('user_id', user.id),
        createClient().from('recommendations').select('*', { count: 'exact', head: true }).eq('sender_id', user.id),
      ])
      setTotalRecosSent(sentCount ?? 0)
      const pCount = picksData?.length ?? 0
      setPicksCount(pCount)
      // Check if any category has 3+ picks (normalise to lowercase)
      const catCounts: Record<string, number> = {}
      for (const p of (picksData ?? [])) { const k = p.category.toLowerCase().trim(); catCounts[k] = (catCounts[k] ?? 0) + 1 }
      setHasCompleteCategory(Object.values(catCounts).some(c => c >= 3))
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
    setImageUploaded(false)
    setImageError(null)
    setTitle('')
    setShowLinkInput(false)
    setManualArtist('')
    setCustomConstraintDefs([])
    setAddingCustomConstraint(false)
    setCustomConstraintInput('')
    setVoiceResult(null)
    setSuggestionSelected(false)
  }, [category])

  function handleTitleChange(val: string) {
    setTitle(val)
    setSuggestionSelected(false)
  }

  async function selectSuggestion(s: Suggestion) {
    setTitle(s.title)
    setSuggestionSelected(true)
    if (s.imageUrl) setImageUrl(s.imageUrl)
    if (s.meta?.genre)   setConstraints(p => ({ ...p, genre: s.meta!.genre! }))
    if (s.meta?.artist)  setManualArtist(s.meta.artist)
    if (s.meta?.address) setConstraints(p => ({ ...p, address: s.meta!.address! }))
    if (s.meta?.city)    setConstraints(p => ({ ...p, location: s.meta!.city! }))
    if (s.meta?.website) setConstraints(p => ({ ...p, website: s.meta!.website! }))
    // Fetch restaurant photo lazily after selection
    if (s.meta?.place_id) {
      try {
        const res = await fetch(`/api/place-photo?place_id=${encodeURIComponent(s.meta.place_id)}`)
        const data = await res.json()
        if (data.photoUrl) setImageUrl(data.photoUrl)
      } catch {}
    }
  }

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
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      fetchLinkMeta(trimmed)
    }
  }

  // Image upload
  async function handleImageFile(file: File) {
    // Show local preview immediately so user gets instant feedback
    const localUrl = URL.createObjectURL(file)
    setImageUrl(localUrl)
    setImageUploaded(false)
    setImageError(null)

    if (!userId) return
    setImageUploading(true)

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${crypto.randomUUID()}.${ext}`

      const form = new FormData()
      form.append('file', file)
      form.append('path', path)

      const res = await fetch('/api/upload-image', { method: 'POST', body: form })
      const json = await res.json()

      if (!res.ok) {
        setImageError(`Upload failed: ${json.error ?? 'unknown error'}`)
      } else {
        setImageUrl(json.publicUrl)
        setImageUploaded(true)
      }
    } catch (e: any) {
      setImageError(`Upload failed: ${e?.message ?? 'unknown error'}`)
    } finally {
      setImageUploading(false)
    }
  }

  const selectedFriends = friends.filter((f) => f.selected)
  const VENUE_CATEGORIES = new Set(['restaurant', 'bars', 'clubs', 'cocktails', 'pubs', 'wine_bars', 'culture'])
  const isRestaurant = category !== null && VENUE_CATEGORIES.has(category)
  const activeDefs: ConstraintDef[] = category && category !== 'custom'
    ? (CONSTRAINTS[category] ?? CONSTRAINTS.default)
    : CONSTRAINTS.default
  const allDefs: ConstraintDef[] = [...activeDefs, ...customConstraintDefs]

  const canSend = category !== null && title.trim().length > 0 && selectedFriends.length > 0 && !sending

  const sendingRef = useRef(false)
  async function handleSend(force = false) {
    if (!canSend || !userId || !category || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    setSendError(null)

    try {
    // Check for duplicates (skip if user already confirmed)
    if (!force && !dupeConfirmed) {
      const { duplicateNames } = await checkDuplicateReco({
        senderId: userId,
        title: title.trim(),
        category,
        recipientIds: selectedFriends.map((f) => f.id),
      })
      if (duplicateNames.length > 0) {
        setDupeWarning(`You've already sent this to ${duplicateNames.join(', ')}`)
        setSending(false); sendingRef.current = false
        return
      }
    }

    const finalCat = category === 'custom' ? 'custom' : category
    const finalCustomCat = category === 'custom' ? customCat.trim() : undefined

    const meta: Record<string, unknown> = {}

    // Image
    if (imageUrl) meta.artwork_url = imageUrl

    // Link meta (auto-filled from Spotify / Maps) or manual artist from autocomplete
    if (linkMeta?.artist) meta.artist = linkMeta.artist
    else if (manualArtist.trim()) meta.artist = manualArtist.trim()
    if (linkMeta?.artworkUrl && !meta.artwork_url) meta.artwork_url = linkMeta.artworkUrl
    if (linkMeta?.city) meta.location = linkMeta.city + (linkMeta.country ? `, ${linkMeta.country}` : '')
    if (linkMeta?.address) meta.address = linkMeta.address

    // All constraint fields — map key names to meta field names
    const KEY_MAP: Record<string, string> = { streaming: 'streaming_service' }
    const customDetails: { label: string; value: string }[] = []
    for (const [key, val] of Object.entries(constraints)) {
      if (!val) continue
      // Custom constraints — save with their label
      if (key.startsWith('custom_')) {
        const def = customConstraintDefs.find(d => d.key === key)
        if (def) customDetails.push({ label: def.label, value: val })
      } else {
        meta[KEY_MAP[key] ?? key] = val
      }
    }
    if (customDetails.length > 0) meta.custom_details = customDetails

    const links: string[] = []
    if (linkInput.trim()) links.push(linkInput.trim())

    // Extract location from any Google Maps links if we don't have it yet
    const allLinks = [...links]
    if (!meta.location && !meta.address) {
      const mapsLink = allLinks.find(l => l.includes('google.com/maps') || l.includes('goo.gl') || l.includes('maps.app.goo.gl'))
      if (mapsLink) {
        try {
          const res = await fetch(`/api/link-meta?url=${encodeURIComponent(mapsLink)}`)
          if (res.ok) {
            const data = await res.json()
            if (data.city) meta.location = data.city + (data.country ? `, ${data.country}` : '')
            if (data.address) meta.address = data.address
            if (data.title && !title.trim()) setTitle(data.title)
            if (data.artworkUrl && !meta.artwork_url) meta.artwork_url = data.artworkUrl
          }
        } catch {}
      }
    }

    // Upload voice note if present
    let whyAudioUrl: string | undefined
    if (voiceResult?.blob) {
      try {
        const ext = voiceResult.blob.type.includes('webm') ? 'webm' : 'ogg'
        const audioPath = `${userId}/${crypto.randomUUID()}.${ext}`
        const form = new FormData()
        form.append('file', voiceResult.blob, `voice.${ext}`)
        form.append('path', audioPath)
        const uploadRes = await fetch('/api/upload-audio', { method: 'POST', body: form })
        const uploadJson = await uploadRes.json()
        if (uploadRes.ok && uploadJson.publicUrl) {
          whyAudioUrl = uploadJson.publicUrl
        }
      } catch {} // voice upload failed — send without it
    }

    if (voiceResult?.transcript) meta.why_audio_transcript = voiceResult.transcript
    if (voiceResult?.waveform) meta.why_audio_waveform = voiceResult.waveform
    if (voiceResult?.durationSec) meta.why_audio_duration = Math.round(voiceResult.durationSec)

    // Last-resort image fetch for venues with no image
    if (!meta.artwork_url && isRestaurant && title.trim()) {
      try {
        const q = [title.trim(), meta.location, meta.address].filter(Boolean).join(', ')
        const res = await fetch(`/api/place-photo?q=${encodeURIComponent(q as string)}`)
        const data = await res.json()
        if (data.photoUrl) meta.artwork_url = data.photoUrl
      } catch {}
    }

    const { error } = await sendReco({
      senderId: userId,
      category: finalCat,
      customCat: finalCustomCat,
      title: title.trim(),
      whyText: why.trim() || undefined,
      whyAudioUrl,
      links,
      meta,
      recipientIds: selectedFriends.map((f) => f.id),
    })

    if (error) { setSendError(error); setSending(false); sendingRef.current = false; return }
    setSending(false); sendingRef.current = false
    setSent(true)
    } catch (e: any) {
      setSendError(e?.message ?? 'Something went wrong')
      setSending(false); sendingRef.current = false
    }
  }

  // ─── Success screen ────────────────────────────────────────────────────────
  if (sent) {
    const names = selectedFriends.map((f) => f.name)
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {!embedded && <><StatusBar /><NavHeader title="Give a Reco" closeHref="/home" /></>}
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
    music: 'album or track', book: 'book', film: 'film',
    bars: 'bar', clubs: 'club', cocktails: 'cocktail bar',
    culture: 'place', pubs: 'pub', wine_bars: 'wine bar',
    custom: customCat || 'thing',
  }
  const singular = category ? (SINGULAR[category] ?? getCategoryLabel(category).toLowerCase()) : ''

  const catColor = category ? CATEGORIES.find((c) => c.id === category)?.color ?? '#D4E23A' : '#D4E23A'



  // ─── TOP 03 nudge (recommendation, not a blocker) ──────────────────────
  const showTop03Nudge = picksCount !== null && !hasCompleteCategory && !isForward && totalRecosSent >= 3 && !top03Dismissed

  // ─── Forward mode ─────────────────────────────────────────────────────────
  if (isForward && forwardTitle) {
    const forwardCanSend = selectedFriends.length > 0 && !sending

    async function handleForwardSend() {
      if (!forwardCanSend || !userId || !forwardCategory) return
      setSending(true)
      setSendError(null)
      try {
        const meta: Record<string, unknown> = {}
        if (forwardImage) meta.artwork_url = forwardImage
        if (forwardFrom) meta.forwarded_from = forwardFrom

        const { recoId, error } = await sendReco({
          senderId: userId,
          category: forwardCategory,
          title: forwardTitle,
          whyText: why.trim() || forwardWhy || undefined,
          meta,
          recipientIds: selectedFriends.map((f) => f.id),
        })
        if (error) { setSendError(error); setSending(false); sendingRef.current = false; return }

        // Notify the original sender that their reco was forwarded
        if (originalSenderId && originalSenderId !== userId) {
          const supabase = createClient()
          const forwardedToNames = selectedFriends.map(f => f.name).join(', ')
          await supabase.from('notifications').insert({
            user_id: originalSenderId,
            type: 'reco_received' as const,
            actor_id: userId,
            reco_id: recoId,
            payload: {
              subtype: 'forwarded',
              title: forwardTitle,
              category: forwardCategory,
              forwarded_to: forwardedToNames,
              forwarded_count: selectedFriends.length,
            },
          })
        }

        setSending(false); sendingRef.current = false
        setSent(true)
      } catch (e: any) {
        setSendError(e?.message ?? 'Something went wrong')
        setSending(false); sendingRef.current = false
      }
    }

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {!embedded && <><StatusBar /><NavHeader title="Forward Reco" closeHref="/home" /></>}

        <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
          {/* Reco being forwarded */}
          {(() => {
            const catColor = forwardCategory ? getCategoryColor(forwardCategory) : '#888'
            const catBg = forwardCategory ? getCategoryBg(forwardCategory) : '#1a1a1e'
            return (
              <div className="rounded-card px-4 py-4 mb-4" style={{ background: catBg, border: `1.5px solid ${catColor}44` }}>
                <div className="flex items-center gap-3">
                  {forwardImage && (
                    <img src={forwardImage} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" style={{ border: `1px solid ${catColor}44` }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[18px] font-bold text-white tracking-[-0.4px] truncate">{forwardTitle}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.5px]" style={{ color: catColor }}>{getCategoryLabel(forwardCategory!)}</span>
                      {forwardFrom && <span className="text-[12px] text-text-faint">from {forwardFrom}</span>}
                    </div>
                  </div>
                </div>
                {forwardWhy && (
                  <div className="text-[13px] text-text-muted leading-[1.5] mt-3 pt-3" style={{ borderTop: `1px solid ${catColor}22` }}>"{forwardWhy}"</div>
                )}
              </div>
            )
          })()}

          {/* Your message */}
          <div className="mb-4">
            <div className="text-[12px] font-semibold text-text-faint uppercase tracking-[0.4px] mb-2">Add your take</div>
            <textarea
              className="w-full bg-bg-card border border-border rounded-input px-3 py-2.5 text-[14px] text-white outline-none placeholder:text-[#444] font-sans resize-none leading-[1.6] min-h-[44px]"
              placeholder="Why are you forwarding this?"
              rows={2}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>

          {/* Who to send to */}
          <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-3">Send to</div>

          <div className="relative mb-3">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="w-full bg-bg-card border border-border rounded-input pl-8 pr-3 text-[13px] text-text-secondary outline-none placeholder:text-[#333] font-sans"
              style={{ minHeight: '44px' }}
              placeholder="Search friends..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>

          {/* Search results */}
          {friendSearch.trim().length > 0 && (
            <div className="flex flex-col gap-0.5 mb-3">
              {filteredFriends.filter((f) => !f.selected).length === 0 ? (
                <div className="text-[12px] text-text-faint px-2 py-1">No friends found.</div>
              ) : (
                filteredFriends.filter((f) => !f.selected).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { toggleFriend(f.id); setFriendSearch('') }}
                    className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-bg-card transition-colors text-left w-full"
                  >
                    <div className="w-8 h-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                      {f.avatar_url ? <img src={f.avatar_url} alt={f.name} className="w-full h-full object-cover" /> : initials(f.name)}
                    </div>
                    <span className="text-[14px] font-medium text-white">{f.name}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected friends */}
          {selectedFriends.length > 0 && (
            <div className="flex flex-wrap gap-[5px] mb-3">
              {selectedFriends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFriend(f.id)}
                  className="flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1.5 rounded-chip border transition-all"
                  style={{ color: '#D4E23A', borderColor: '#D4E23A', background: 'rgba(212,226,58,0.08)' }}
                >
                  {f.name}
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              ))}
            </div>
          )}

          {/* All friends (when no search) */}
          {!friendSearch.trim() && friends.filter(f => !f.selected).length > 0 && (
            <div className="flex flex-col gap-0.5">
              {friends.filter(f => !f.selected).map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFriend(f.id)}
                  className="flex items-center gap-2.5 px-2 py-2.5 rounded-lg hover:bg-bg-card transition-colors text-left w-full"
                >
                  <div className="w-8 h-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                    {f.avatar_url ? <img src={f.avatar_url} alt={f.name} className="w-full h-full object-cover" /> : initials(f.name)}
                  </div>
                  <span className="text-[14px] font-medium text-white">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          {loadingFriends && (
            <div className="flex justify-center py-4">
              <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {sendError && <div className="mt-3 text-[13px] text-red-400 text-center">{sendError}</div>}
        </div>

        <button
          onClick={handleForwardSend}
          disabled={!forwardCanSend}
          className={`mt-3 w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
            forwardCanSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          {sending ? 'Forwarding...' : `Forward to ${selectedFriends.length > 0 ? selectedFriends.map(f => f.name).join(', ') : '...'}`}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {!embedded && <><StatusBar /><NavHeader title="Give a Reco" closeHref="/home" /></>}

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">
        {/* TOP 03 nudge — dismissible recommendation */}
        {showTop03Nudge && (
          <div className="mb-3 px-4 py-3 bg-accent/8 border border-accent/20 rounded-card flex items-start gap-3">
            <span className="text-[20px] flex-shrink-0 mt-0.5">🏆</span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-white mb-0.5">Set your TOP 03</div>
              <div className="text-[12px] text-text-faint leading-[1.5]">People trust recos more when they can see your taste.</div>
              <Link href="/profile/top3" className="text-[12px] font-semibold text-accent mt-1 inline-block">Add your picks →</Link>
            </div>
            <button onClick={() => setTop03Dismissed(true)} className="text-text-faint hover:text-white transition-colors flex-shrink-0 p-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}

        <div className="bg-bg-card border border-border rounded-card px-4 py-4">

          {/* ── Pre-selected friend banner ── */}
          {preselectedId && (() => {
            const friend = friends.find(f => f.id === preselectedId)
            if (!friend) return null
            const isProve = sendContext === 'prove'
            return (
              <div className="flex items-center gap-3 px-3 py-2.5 mb-4 rounded-xl bg-accent/8 border border-accent/20">
                <div className="w-8 h-8 rounded-full bg-bg-base border border-border flex items-center justify-center text-[10px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                  {friend.avatar_url
                    ? <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                    : initials(friend.name)
                  }
                </div>
                <div className="text-[13px] text-accent leading-[1.4]">
                  {isProve ? (
                    <>
                      <span className="font-semibold">Prove yourself to {friend.name}.</span>{' '}
                      <span className="text-accent/70">Make this one count.</span>
                    </>
                  ) : (
                    <span className="font-semibold">Giving a reco to {friend.name}</span>
                  )}
                </div>
              </div>
            )
          })()}

          {/* ── Category prompt ── */}
          <div className="text-[26px] font-semibold text-white tracking-[-0.7px] leading-[1.1] mb-4">
            {category ? `What ${singular}?` : "What's the reco?"}
          </div>
          <CategoryChips
            category={category}
            customCat={customCat}
            onCategoryChange={setCategory}
            onCustomCatChange={setCustomCat}
          />

          {/* ── Everything below only renders once a category is picked ── */}
          {category && (
            <>
              <div className="border-t border-[#0e0e10] mb-4" />

              {/* ── Primary: title input + autocomplete ── */}
              <AutocompleteInput
                category={category}
                value={title}
                onChange={handleTitleChange}
                onSelect={selectSuggestion}
                placeholder={`Name of ${singular}…`}
                isVenue={isRestaurant}
                userLat={userLocation.current?.lat}
                userLng={userLocation.current?.lng}
              />

              {/* ── Auto-filled details from search ── */}
              {suggestionSelected && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {constraints.location && (
                    <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#1a1a1e] text-text-muted">
                      {PIN} {constraints.location}
                    </span>
                  )}
                  {constraints.address && (
                    <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#1a1a1e] text-text-muted">
                      {PIN} {constraints.address}
                    </span>
                  )}
                  {manualArtist && (
                    <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#1a1a1e] text-text-muted">
                      {MUSIC} {manualArtist}
                    </span>
                  )}
                  {constraints.genre && (
                    <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#1a1a1e] text-text-muted">
                      {FILM} {constraints.genre}
                    </span>
                  )}
                  {constraints.streaming && (
                    <span className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#1a1a1e] text-text-muted">
                      {TV} {constraints.streaming}
                    </span>
                  )}
                </div>
              )}

              {/* ── Link paste (secondary option) ── */}
              {!linkMeta && !showLinkInput && !suggestionSelected && (
                <button
                  onClick={() => setShowLinkInput(true)}
                  className="mb-4 flex items-center gap-1.5 text-[12px] text-text-faint hover:text-text-muted transition-colors"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  Got a link? Paste it here instead
                </button>
              )}

              {showLinkInput && !linkMeta && (
                <div className="mb-4">
                  <div className="flex items-center gap-2.5 rounded-input px-3 py-3 border border-border bg-bg-base">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                    <input
                      autoFocus
                      className="flex-1 bg-transparent outline-none text-[14px] text-white placeholder:text-[#444] font-sans"
                      placeholder="Paste a Spotify, Maps, or Apple link…"
                      value={linkInput}
                      onChange={(e) => handleLinkChange(e.target.value)}
                    />
                    {linkLoading ? (
                      <div className="w-3.5 h-3.5 border-2 border-border border-t-text-faint rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <button
                        onClick={() => { setShowLinkInput(false); setLinkInput('') }}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Link resolved: result card ── */}
              {linkMeta && (
                <div className="mb-4">
                  {imageUrl && (linkMeta.type === 'music' || linkMeta.type === 'podcast') && (
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-bg-base border border-border rounded-input mb-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold text-white truncate">{linkMeta.title}</div>
                        {linkMeta.artist && <div className="text-[12px] text-text-muted">{linkMeta.artist}</div>}
                      </div>
                      <button onClick={() => { setLinkMeta(null); setLinkInput(''); setImageUrl(null); setTitle(''); setShowLinkInput(false) }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                  {linkMeta.type === 'place' && (
                    <div className="px-3 py-2.5 bg-bg-base border border-border rounded-input mb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {linkMeta.title ? (
                            <div className="text-[14px] font-semibold text-white">{linkMeta.title}</div>
                          ) : (
                            <input
                              autoFocus
                              className="w-full bg-transparent outline-none text-[14px] font-semibold text-white placeholder:text-[#555] font-sans"
                              placeholder="What's it called?"
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                            />
                          )}
                          {linkMeta.address && <div className="text-[12px] text-text-faint mt-0.5">{linkMeta.address}</div>}
                          {(linkMeta.city || linkMeta.country) && (
                            <div className="text-[11px] text-text-faint mt-0.5">{[linkMeta.city, linkMeta.country].filter(Boolean).join(', ')}</div>
                          )}
                        </div>
                        <button onClick={() => { setLinkMeta(null); setLinkInput(''); setTitle(''); setConstraints({}); setShowLinkInput(false) }} className="flex-shrink-0 mt-0.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Photo banner (shown for any category when we have an image) ── */}
              {(title || linkMeta) && imageUrl && (
                <div className="w-full h-[180px] rounded-xl overflow-hidden mb-2 relative">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  {imageUploading && (
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span className="text-[11px] text-white font-medium">Uploading…</span>
                    </div>
                  )}
                  {imageUploaded && !imageUploading && (
                    <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span className="text-[11px] text-white font-medium">Photo saved</span>
                    </div>
                  )}
                  <button
                    onClick={() => { setImageUrl(null); setImageUploaded(false); setImageError(null) }}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}

              {/* ── Photo CTA (directly below image or as standalone) ── */}
              {(title || linkMeta) && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full mb-3 py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    imageUrl
                      ? 'bg-[#1a1a1e] text-[#888] text-[12px]'
                      : 'bg-accent/10 border border-accent/30 text-accent text-[13px] font-semibold'
                  }`}
                >
                  {CAM}
                  {imageUploading
                    ? <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Uploading…</>
                    : imageUrl
                      ? 'Replace photo'
                      : 'Add a photo — makes your reco stand out'
                  }
                </button>
              )}

              {imageError && (
                <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-input text-[11px] text-red-400 leading-[1.5]">
                  {imageError}
                </div>
              )}
            </>
          )}

          {/* ── Rest of form: only once we have a title ── */}
          {(title.trim().length > 0) && (<>

          {/* ── Group 1: Extra details ── */}
          <div className="anim-in" style={{ animationDelay: '0ms' }}>
          {/* ── Divider ── */}
          <div className="border-t border-[#0e0e10] mt-4 pt-4 mb-1">
            <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-0.5">Extra details</div>
            <div className="text-[12px] text-text-faint mb-3">Optional — more context makes a better reco</div>
          </div>

          {/* ── Constraint tabs (horizontal scroll) — hide auto-filled ones ── */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 pb-2 mb-1">
            {allDefs.filter((def) => {
              // If this was auto-filled from search and shown as a pill above, hide it from tabs
              if (!suggestionSelected) return true
              const autoFilledKeys = ['location', 'address', 'genre', 'streaming']
              return !(autoFilledKeys.includes(def.key) && (constraints[def.key] ?? '').trim().length > 0)
            }).map((def) => {
              const filled = (constraints[def.key] ?? '').trim().length > 0
              const isOpen = openConstraint === def.key
              const active = filled
              return (
                <button
                  key={def.key}
                  onClick={() => {
                    setOpenConstraint(isOpen ? null : def.key)
                    setAddingCustomConstraint(false)
                    if (!isOpen && def.key === 'price' && !(constraints.price ?? '').trim()) {
                      setConstraints(p => ({ ...p, price: '£' }))
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all flex-shrink-0 ${
                    active
                      ? 'bg-accent text-accent-fg'
                      : isOpen
                        ? 'bg-[#1a1a1e] text-white border border-accent/50'
                        : 'bg-[#1a1a1e] text-[#888]'
                  }`}
                >
                  {def.icon}
                  {filled ? constraints[def.key] : def.label}
                </button>
              )
            })}

            {/* Add custom tab */}
            <button
              onClick={() => { setAddingCustomConstraint(true); setOpenConstraint(null) }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all flex-shrink-0 bg-[#1a1a1e] text-[#555] border border-dashed border-[#333]"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add
            </button>
          </div>

          {/* Custom constraint label input */}
          {addingCustomConstraint && (
            <div className="mb-2 flex gap-2">
              <input
                autoFocus
                className="flex-1 bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#333] font-sans"
                placeholder="Label (e.g. Dress code, Vibe…)"
                value={customConstraintInput}
                onChange={(e) => setCustomConstraintInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customConstraintInput.trim()) {
                    const key = `custom_${Date.now()}`
                    const newDef: ConstraintDef = { key, label: customConstraintInput.trim(), placeholder: 'Add details…', icon: STAR }
                    setCustomConstraintDefs((prev) => [...prev, newDef])
                    setOpenConstraint(key)
                    setCustomConstraintInput('')
                    setAddingCustomConstraint(false)
                  } else if (e.key === 'Escape') {
                    setAddingCustomConstraint(false)
                    setCustomConstraintInput('')
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!customConstraintInput.trim()) return
                  const key = `custom_${Date.now()}`
                  const newDef: ConstraintDef = { key, label: customConstraintInput.trim(), placeholder: 'Add details…', icon: STAR }
                  setCustomConstraintDefs((prev) => [...prev, newDef])
                  setOpenConstraint(key)
                  setCustomConstraintInput('')
                  setAddingCustomConstraint(false)
                }}
                disabled={!customConstraintInput.trim()}
                className={`px-4 py-2 rounded-input text-[13px] font-semibold transition-all ${customConstraintInput.trim() ? 'bg-accent text-accent-fg' : 'bg-border text-text-faint'}`}
              >
                OK
              </button>
            </div>
          )}

          {/* Expanded constraint input */}
          {openConstraint && (
            <div className="mb-2 flex gap-2">
              <input
                autoFocus
                className="flex-1 bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#333] font-sans"
                placeholder={allDefs.find((d) => d.key === openConstraint)?.placeholder ?? ''}
                value={constraints[openConstraint] ?? ''}
                onChange={(e) => setConstraints((prev) => ({ ...prev, [openConstraint]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && setOpenConstraint(null)}
              />
              <button
                onClick={() => setOpenConstraint(null)}
                className="px-4 py-2 rounded-input text-[13px] font-semibold bg-accent text-accent-fg"
              >
                OK
              </button>
            </div>
          )}

          </div>{/* end group 1 */}

          {/* ── Group 2: Why ── */}
          <div className="anim-in" style={{ animationDelay: '80ms' }}>
          <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-1.5 mt-3">Why?</div>
          <textarea
            ref={whyRef}
            className="w-full bg-transparent outline-none text-[14px] text-text-secondary placeholder:text-[#444] font-sans resize-none leading-[1.6] min-h-[60px]"
            placeholder="Why will they love it? Be specific — that's what makes a reco actually useful."
            rows={1}
            value={why}
            onChange={(e) => {
              setWhy(e.target.value)
              const el = whyRef.current
              if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
            }}
          />
          <div className="mt-2">
            <VoiceButton onRecorded={(r) => setVoiceResult(r)} onClear={() => setVoiceResult(null)} />
            <div className="text-[10px] text-text-faint mt-1">We transcribe it so they can read or listen.</div>
          </div>
          </div>{/* end group 2 */}

          {/* ── Group 3: Send to — hidden when pre-selected from friend profile ── */}
          {!preselectedId && <div className="anim-in" style={{ animationDelay: '160ms' }}>
          {/* ── Divider ── */}
          <div className="border-t border-[#0e0e10] mt-4 mb-3" />

          <div className="flex items-center justify-between mb-3">
            <div className="text-[17px] font-semibold text-white tracking-[-0.3px]">Send to</div>
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
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="w-full bg-bg-base border border-border rounded-input pl-8 pr-3 text-[13px] text-text-secondary outline-none placeholder:text-[#333] font-sans"
              style={{ minHeight: '40px' }}
              placeholder="Search friends…"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>

          {/* Friends list — show suggestions when empty, search results when typing */}
          {(() => {
            const unselected = (friendSearch.trim() ? filteredFriends : friends).filter((f) => !f.selected)
            const toShow = friendSearch.trim() ? unselected : unselected.slice(0, 5)
            return toShow.length > 0 ? (
              <div className="flex flex-col gap-0.5 mb-2">
                {!friendSearch.trim() && <div className="text-[10px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1 px-2">Suggestions</div>}
                {toShow.map((f) => (
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
                ))}
              </div>
            ) : friendSearch.trim() ? (
              <div className="text-[12px] text-text-faint px-2 py-1 mb-2">No friends found.</div>
            ) : null
          })()}

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
                  {f.name}
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
          </div>}{/* end group 3 */}

          </>)}
        </div>

        {/* Error */}
        {sendError && (
          <div className="mt-3 text-center">
            <div className="text-[13px] text-red-400">{sendError}</div>
            <button
              onClick={() => { setSendError(null); handleSend(true) }}
              className="mt-2 px-4 py-1.5 text-[13px] font-medium text-white bg-[#2a2a2e] rounded-lg active:opacity-70"
            >
              Retry
            </button>
          </div>
        )}

        {/* Duplicate warning */}
        {dupeWarning && (
          <div className="mt-3 px-4 py-3 bg-[#2a2210] border border-[#554a1e] rounded-xl text-center">
            <div className="text-[13px] text-[#e8c840] font-medium mb-2">{dupeWarning}</div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDupeWarning(null); setDupeConfirmed(false) }}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-text-muted bg-bg-base border border-border"
              >
                Cancel
              </button>
              <button
                onClick={() => { setDupeWarning(null); setDupeConfirmed(true); handleSend(true) }}
                className="flex-1 py-2 rounded-lg text-[13px] font-semibold text-accent-fg bg-accent"
              >
                Send anyway
              </button>
            </div>
          </div>
        )}

        {/* Send button */}
        {!dupeWarning && (
          <button
            onClick={() => handleSend()}
            disabled={!canSend}
            className={`mt-3 w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
              canSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
            }`}
          >
            {sending ? 'Giving…' : 'Give reco'}
          </button>
        )}
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
