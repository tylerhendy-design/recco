'use client'

import { useState, useRef, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { CategoryChip } from '@/components/ui/CategoryChip'
import { CategoryDot } from '@/components/ui/CategoryDot'
import { VoiceButton } from '@/components/ui/VoiceButton'
import { CATEGORIES, type CategoryId, getCategoryLabel } from '@/constants/categories'
import { createClient } from '@/lib/supabase/client'
import { fetchFriends } from '@/lib/data/friends'
import { sendReco } from '@/lib/data/recos'
import { initials } from '@/lib/utils'

interface Friend {
  id: string
  name: string
  username: string
  avatar_url: string | null
  active: boolean
}

interface SpotifyMeta {
  title: string
  artist: string | null
  artworkUrl: string | null
}

function getLinkLabel(url: string): string {
  try {
    const h = new URL(url).hostname.replace('www.', '')
    if (h.includes('spotify.com')) return 'Spotify'
    if (h.includes('instagram.com')) return 'Instagram'
    if (h.includes('google.com')) return 'Google Maps'
    if (h.includes('maps.apple.com')) return 'Apple Maps'
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'YouTube'
    if (h.includes('tripadvisor.com')) return 'TripAdvisor'
    if (h.includes('yelp.com')) return 'Yelp'
    if (h.includes('opentable.com')) return 'OpenTable'
    if (h.includes('resy.com')) return 'Resy'
    if (h.includes('imdb.com')) return 'IMDb'
    if (h.includes('netflix.com')) return 'Netflix'
    if (h.includes('goodreads.com')) return 'Goodreads'
    if (h.includes('amazon.')) return 'Amazon'
    return 'Website'
  } catch { return 'Link' }
}

export default function GivePage() {
  return (
    <Suspense>
      <GivePageInner />
    </Suspense>
  )
}

function GivePageInner() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('to')

  const [userId, setUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)
  const [friendSearch, setFriendSearch] = useState('')

  const [category, setCategory] = useState<CategoryId | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [links, setLinks] = useState<string[]>([''])
  const [linksOpen, setLinksOpen] = useState(false)

  // Image / Spotify
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [spotifyInput, setSpotifyInput] = useState('')
  const [spotifyMeta, setSpotifyMeta] = useState<SpotifyMeta | null>(null)
  const [spotifyLoading, setSpotifyLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const fetched = await fetchFriends(user.id)
      setFriends(
        fetched.map((f: any) => ({
          id: f.id,
          name: f.display_name,
          username: f.username,
          avatar_url: f.avatar_url,
          active: f.id === preselectedId,
        }))
      )
      setLoadingFriends(false)
    })
  }, [preselectedId])

  // Reset category-specific state when category changes
  useEffect(() => {
    setSpotifyMeta(null)
    setSpotifyInput('')
    setImageUrl(null)
    if (category === 'restaurant') setLinksOpen(true)
  }, [category])

  function toggleFriend(id: string) {
    setFriends((prev) => prev.map((f) => f.id === id ? { ...f, active: !f.active } : f))
  }

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q))
  }, [friendSearch, friends])

  // Spotify auto-fill
  async function fetchSpotifyMeta(url: string) {
    if (!url.includes('spotify.com')) return
    setSpotifyLoading(true)
    try {
      const res = await fetch(`/api/spotify-meta?url=${encodeURIComponent(url)}`)
      if (res.ok) {
        const data = await res.json()
        setSpotifyMeta(data)
        if (data.title && !title) setTitle(data.title)
        if (data.artworkUrl) setImageUrl(data.artworkUrl)
        // Store the Spotify link
        setLinks((prev) => {
          const without = prev.filter((l) => !l.includes('spotify.com'))
          return [url, ...without].filter(Boolean)
        })
      }
    } finally {
      setSpotifyLoading(false)
    }
  }

  function handleSpotifyInputChange(val: string) {
    setSpotifyInput(val)
    if (val.includes('spotify.com/')) {
      fetchSpotifyMeta(val.trim())
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

  const activeFriends = friends.filter((f) => f.active)
  const anyActive = activeFriends.length > 0
  const isSpotifyCategory = category === 'music' || category === 'podcast'
  const isRestaurant = category === 'restaurant'
  const hasGoogleMapsLink = links.some((l) => { try { const h = new URL(l).hostname; return h.includes('google.com') || h.includes('maps.apple.com') } catch { return false } })
  const canSend = category !== null && title.trim().length > 0 && anyActive && !sending && (!isRestaurant || hasGoogleMapsLink)
  const artwork = spotifyMeta?.artworkUrl ?? imageUrl

  const activeNames = activeFriends.map((f) => f.name)

  async function handleSend() {
    if (!canSend || !userId || !category) return
    setSending(true)
    setSendError(null)

    const finalCat = category === 'custom' ? 'custom' : category
    const finalCustomCat = category === 'custom' ? customCat.trim() : undefined
    const meta: Record<string, unknown> = {}
    if (artwork) meta.artwork_url = artwork
    if (spotifyMeta?.artist) meta.artist = spotifyMeta.artist

    const { error } = await sendReco({
      senderId: userId,
      category: finalCat,
      customCat: finalCustomCat,
      title: title.trim(),
      whyText: why.trim() || undefined,
      links: links.filter((l) => l.trim()),
      meta,
      recipientIds: activeFriends.map((f) => f.id),
    })

    if (error) { setSendError(error); setSending(false); return }
    setSent(true)
  }

  if (sent) {
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
            <div className="text-[24px] font-bold text-white tracking-[-0.6px] leading-[1.2] mb-2">
              Reco given. Good job.
            </div>
            <div className="text-[15px] text-text-dim leading-[1.6]">
              We hope {activeNames.length === 1 ? activeNames[0] : 'they'} love{activeNames.length === 1 ? 's' : ''} it.
            </div>
          </div>
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
      <NavHeader title="give a reco" closeHref="/home" />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-8">

        {/* Category chips */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.id}
                id={cat.id}
                selected={category === cat.id}
                dashed={cat.id === 'custom'}
                onClick={() => setCategory(cat.id === category ? null : cat.id as CategoryId)}
              />
            ))}
          </div>
          {category === 'custom' && (
            <input
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value)}
              placeholder="Category name…"
              className="w-full mt-2 bg-bg-card border border-border rounded-input px-3 py-2 text-[13px] text-white placeholder:text-text-faint outline-none focus:border-accent"
            />
          )}
        </div>

        {/* THE CARD */}
        <div className="px-4">
          <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-5 flex flex-col gap-0">

            {/* Category dot */}
            {category && (
              <div className="mb-2.5">
                <CategoryDot category={category} />
              </div>
            )}

            {/* Spotify quick-fill (music/podcast) */}
            {isSpotifyCategory && !spotifyMeta && (
              <div className="mb-3">
                <div className="flex items-center gap-2 bg-[#0a1a0e] border border-[#1DB954]/30 rounded-input px-3 py-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954">
                    <circle cx="12" cy="12" r="12"/>
                    <path d="M6 9.6C9.3 7.5 14.9 7.8 18 10l-.9 1.5C15 9.7 10.2 9.4 7.2 11.3L6 9.6zm-.5 3.3C9.8 10.3 16.6 10.7 20 13.5l-.9 1.4C16 12.3 9.9 12 6.7 14.3l-1.2-1.4zm1 3.2c3-2 8.1-1.7 11 .5l-.9 1.3c-2.5-1.9-7-2.1-9.6-.4l-.5-1.4z" fill="#0a1f0e"/>
                  </svg>
                  <input
                    className="flex-1 bg-transparent outline-none text-[13px] text-white placeholder:text-[#1DB954]/50 font-sans"
                    placeholder="Paste Spotify link to auto-fill…"
                    value={spotifyInput}
                    onChange={(e) => handleSpotifyInputChange(e.target.value)}
                  />
                  {spotifyLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-[#1DB954]/40 border-t-[#1DB954] rounded-full animate-spin flex-shrink-0" />
                  )}
                </div>
              </div>
            )}

            {/* Artwork + Title */}
            {isSpotifyCategory ? (
              // Square artwork left of title (music/podcast style)
              <div className="flex gap-3 items-start mb-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-[72px] h-[72px] rounded-xl flex-shrink-0 overflow-hidden border border-border relative flex items-center justify-center bg-bg-base"
                >
                  {imageUploading ? (
                    <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
                  ) : artwork ? (
                    <img src={artwork} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-text-faint">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M9 9a3 3 0 11 6 0 3 3 0 01-6 0z"/><path d="M17.94 16A8 8 0 118 4.06"/><path d="M12 20v-4M12 4V2"/>
                      </svg>
                    </div>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <input
                    className="text-[22px] font-semibold text-white tracking-[-0.6px] leading-[1.1] w-full bg-transparent outline-none placeholder:text-[#2a2a30] font-sans"
                    placeholder={spotifyMeta ? spotifyMeta.title : category === 'podcast' ? 'Podcast name…' : 'Album or track…'}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  {spotifyMeta?.artist && (
                    <div className="text-[13px] text-text-muted mt-0.5">{spotifyMeta.artist}</div>
                  )}
                  {spotifyMeta && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-[#0a1a0e] text-[#1DB954] mt-1.5">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="#1DB954"><circle cx="12" cy="12" r="12"/><path d="M6 9.6C9.3 7.5 14.9 7.8 18 10l-.9 1.5C15 9.7 10.2 9.4 7.2 11.3L6 9.6zm-.5 3.3C9.8 10.3 16.6 10.7 20 13.5l-.9 1.4C16 12.3 9.9 12 6.7 14.3l-1.2-1.4zm1 3.2c3-2 8.1-1.7 11 .5l-.9 1.3c-2.5-1.9-7-2.1-9.6-.4l-.5-1.4z" fill="#0a1f0e"/></svg>
                      Spotify
                    </span>
                  )}
                </div>
              </div>
            ) : (
              // Banner image above title (restaurant / film / etc)
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-[160px] rounded-xl mb-3 overflow-hidden border border-dashed border-border relative flex items-center justify-center bg-bg-base"
                  style={artwork ? { border: 'none' } : {}}
                >
                  {imageUploading ? (
                    <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
                  ) : artwork ? (
                    <>
                      <img src={artwork} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-text-faint">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span className="text-[12px] font-medium">Add photo</span>
                    </div>
                  )}
                  {artwork && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setImageUrl(null); setSpotifyMeta(null) }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </button>

                <input
                  className="text-[26px] font-semibold text-white tracking-[-0.7px] leading-[1.05] w-full bg-transparent outline-none placeholder:text-[#2a2a30] font-sans mb-1"
                  placeholder={category ? `Name of ${getCategoryLabel(category)}…` : 'Name it…'}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </>
            )}

            {/* Why */}
            <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5 mt-2">Why?</div>
            <div className="flex gap-2.5 items-start">
              <VoiceButton />
              <textarea
                className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-[#2a2a30] font-sans resize-none leading-[1.5]"
                placeholder="Voice or type your reason…"
                rows={3}
                value={why}
                onChange={(e) => setWhy(e.target.value)}
              />
            </div>

            {/* Links */}
            <div className="mt-3 border-t border-[#1a1a1e] pt-3">
              <button
                onClick={() => setLinksOpen((o) => !o)}
                className="flex items-center justify-between w-full text-[12px] font-semibold text-text-faint hover:text-text-muted transition-colors"
              >
                <span>
                  Links{' '}
                  {isRestaurant
                    ? <span className="font-normal text-accent">— Google Maps required</span>
                    : <span className="font-normal">— optional</span>
                  }
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-200 ${linksOpen ? 'rotate-180' : ''}`}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              {linksOpen && (
                <div className="flex flex-col gap-2 mt-2.5">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 bg-bg-base border border-border rounded-input px-3 py-2">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                        </svg>
                        <input
                          className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-border font-sans"
                          placeholder={isRestaurant && i === 0 ? 'Paste Google Maps link…' : 'Paste a URL…'}
                          value={link}
                          onChange={(e) => { const n = [...links]; n[i] = e.target.value; setLinks(n) }}
                        />
                        {link.trim() && (
                          <span className="text-[10px] text-text-faint flex-shrink-0">{getLinkLabel(link)}</span>
                        )}
                      </div>
                      {links.length > 1 && (
                        <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="w-6 h-6 flex items-center justify-center text-text-faint hover:text-bad transition-colors flex-shrink-0">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setLinks([...links, ''])} className="flex items-center gap-1.5 text-[12px] font-semibold text-text-dim hover:text-text-secondary transition-colors">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add another link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Send to */}
        <div className="px-4 mt-4">
          <div className="text-[11px] font-semibold text-text-muted tracking-[0.4px] uppercase mb-2">Send to</div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-bg-card border border-border rounded-input px-3 py-2 mb-2.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2.5" strokeLinecap="round" className="flex-shrink-0">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-text-faint font-sans"
              placeholder="Search friends…"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>

          {loadingFriends ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-[7px]">
              {filteredFriends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => toggleFriend(f.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-chip border text-[13px] font-medium transition-all ${
                    f.active ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-dim hover:border-text-faint'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-bg-card border border-border overflow-hidden flex items-center justify-center text-[8px] font-bold text-text-secondary flex-shrink-0">
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt={f.name} className="w-full h-full object-cover" />
                      : initials(f.name)
                    }
                  </div>
                  {f.name.split(' ')[0]}
                </button>
              ))}
            </div>
          )}

          {anyActive && (
            <div className="mt-2.5 text-[12px] text-text-faint">
              Giving to {activeNames.length === 1 ? activeNames[0] : `${activeNames.length} people`}
            </div>
          )}
        </div>

        {/* Error */}
        {sendError && (
          <div className="px-4 mt-3 text-[13px] text-red-400 text-center">{sendError}</div>
        )}

        {/* Send button */}
        <div className="px-4 mt-4">
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
              canSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
            }`}
          >
            {sending ? 'Giving…' : 'Give reco'}
          </button>
        </div>

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
