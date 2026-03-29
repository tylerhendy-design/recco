'use client'

import { useState, useEffect, useRef } from 'react'
import { CategoryDot } from './CategoryDot'
import { cn } from '@/lib/utils'
import type { Reco } from '@/types/app.types'
import { getCategoryLabel } from '@/constants/categories'

function getLinkLabel(url: string): string {
  try {
    const u = new URL(url)
    const h = u.hostname.replace('www.', '')
    if (h.includes('instagram.com')) return 'Instagram'
    if (h.includes('twitter.com') || h.includes('x.com')) return 'X / Twitter'
    if (h.includes('google.com') && u.pathname.includes('maps')) return 'Google Maps'
    if (h.includes('maps.apple.com')) return 'Apple Maps'
    if (h.includes('spotify.com')) return 'Spotify'
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'YouTube'
    if (h.includes('facebook.com')) return 'Facebook'
    if (h.includes('tripadvisor.com')) return 'TripAdvisor'
    if (h.includes('yelp.com')) return 'Yelp'
    if (h.includes('opentable.com')) return 'OpenTable'
    if (h.includes('resy.com')) return 'Resy'
    if (h.includes('imdb.com')) return 'IMDb'
    if (h.includes('netflix.com')) return 'Netflix'
    if (h.includes('goodreads.com')) return 'Goodreads'
    if (h.includes('amazon.')) return 'Amazon'
    if (h.includes('apple.com')) return 'Apple'
    return 'Website'
  } catch {
    return 'Link'
  }
}

function timeAgo(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function getPrimaryLink(reco: Reco): string | undefined {
  const m = reco.meta ?? {}
  return m.spotify_url || m.goodreads_url || m.website || m.links?.[0] || undefined
}

type DetailPill = { key: string; value: string }

const DETAIL_ICON: Record<string, React.ReactNode> = {
  location:          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  address:           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  price:             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v1.5m0 9V18m-2.5-8.5c0-1 .9-1.5 2.5-1.5s2.5.8 2.5 2c0 2.5-5 2-5 4.5 0 1.2 1.1 1.5 2.5 1.5s2.5-.4 2.5-1.5"/></svg>,
  budget:            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v1.5m0 9V18m-2.5-8.5c0-1 .9-1.5 2.5-1.5s2.5.8 2.5 2c0 2.5-5 2-5 4.5 0 1.2 1.1 1.5 2.5 1.5s2.5-.4 2.5-1.5"/></svg>,
  occasion:          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  mood:              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  vibes:             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  streaming_service: <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>,
  artist:            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  topic:             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  genre:             <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5"/></svg>,
  era:               <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
  length:            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>,
}

function getDetailPills(reco: Reco): DetailPill[] {
  const m = reco.meta ?? {}
  const candidates: [string, string | undefined | null][] = [
    ['location', m.location],
    ['artist', m.artist],
    ['streaming_service', m.streaming_service],
    ['occasion', m.occasion],
    ['price', m.price],
    ['genre', m.genre],
    ['mood', m.mood],
    ['era', m.era],
    ['address', m.address],
    ['topic', m.topic],
    ['length', m.length],
    ['vibes', m.vibes],
    ['budget', m.budget],
  ]
  return candidates
    .filter((c): c is [string, string] => typeof c[1] === 'string' && c[1].length > 0 && !c[1].startsWith('http'))
    .slice(0, 3)
    .map(([key, value]) => ({ key, value }))
}

// Full Tailwind class strings per category — must be static for JIT to include them
const CAT_PILL: Record<string, { bg: string; border: string; text: string }> = {
  restaurant: { bg: 'bg-red-900/70',    border: 'border-red-500/50',    text: 'text-red-400'    },
  tv:         { bg: 'bg-sky-900/70',    border: 'border-sky-500/50',    text: 'text-sky-400'    },
  podcast:    { bg: 'bg-teal-900/70',   border: 'border-teal-500/50',   text: 'text-teal-400'   },
  music:      { bg: 'bg-purple-900/70', border: 'border-purple-500/50', text: 'text-purple-400' },
  book:       { bg: 'bg-orange-900/70', border: 'border-orange-500/50', text: 'text-orange-400' },
  film:       { bg: 'bg-pink-900/70',   border: 'border-pink-500/50',   text: 'text-pink-400'   },
  custom:     { bg: 'bg-lime-900/70',   border: 'border-lime-500/50',   text: 'text-lime-400'   },
}

function pillClasses(category: string) {
  return CAT_PILL[category] ?? { bg: 'bg-neutral-900/70', border: 'border-neutral-500/50', text: 'text-neutral-400' }
}

interface RecoCardProps {
  reco: Reco
  rank?: number
  onMarkDone?: (reco: Reco) => void
  onBeenThere?: (reco: Reco) => void
  onNoGo?: (reco: Reco) => void
}

export function RecoCard({ reco, onMarkDone, onBeenThere, onNoGo }: RecoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [whyIndex, setWhyIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasImage = !!reco.meta?.artwork_url
  const ptrDown = useRef<{ x: number; y: number } | null>(null)

  function open() {
    setExpanded(true)
    // Allow DOM to paint the hidden sheet before animating in
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)))
  }

  function close() {
    setAnimating(false)
    setTimeout(() => setExpanded(false), 320)
  }

  // Close on browser back gesture
  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  const whyMessages = reco.recommenders
    ?.filter((r) => r.why_text)
    .map((r) => `${r.profile.display_name.split(' ')[0]}: "${r.why_text}"`) ?? []
  if (reco.why_text && whyMessages.length === 0) whyMessages.push(reco.why_text)
  const currentWhy = whyMessages[whyIndex] ?? reco.why_text ?? ''

  const recommenderNames = reco.recommenders
    ?.map((r) => r.profile.display_name.split(' ')[0])
    .slice(0, 2)
    .join(' & ') ?? ''
  const when = reco.created_at ? timeAgo(reco.created_at) : ''
  const details = getDetailPills(reco)
  const pills = pillClasses(reco.category)
  const primaryLink = getPrimaryLink(reco)

  // ─── Dormant card ────────────────────────────────────────────────────────────

  const cardHeight = details.length > 0 ? 320 : 280

  const dormant = hasImage ? (
    <div
      className="rounded-card overflow-hidden cursor-pointer select-none"
      style={{ position: 'relative', height: cardHeight }}
      onClick={(e) => { if ((e.target as HTMLElement).closest('a, button')) return; open() }}
    >
      {/* Image — absolute, fills the fixed-height wrapper */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={reco.meta.artwork_url!}
        alt={reco.title}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />

      {/* Everything else is layered absolutely on top of the image */}

      {/* Gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 30%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.95) 100%)', pointerEvents: 'none' }} />

      {/* Category pill + dots — top left/right */}
      <div style={{ position: 'absolute', top: 16, left: 16, right: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <span className={cn('text-[11px] font-bold uppercase tracking-[1px] px-3 py-1.5 rounded-chip border', pills.bg, pills.border, pills.text)}>
          {getCategoryLabel(reco.category)}
        </span>
        <div style={{ position: 'relative' }}>
          <button
            className="flex gap-[5px] items-center p-1"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
          >
            {[0, 1, 2].map((i) => <div key={i} className="w-[7px] h-[7px] rounded-full bg-white opacity-80" />)}
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-8 z-20 bg-bg-elevated border border-border rounded-input overflow-hidden shadow-xl min-w-[200px]"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-4 py-3 text-[13px] text-text-secondary hover:bg-bg-card transition-colors border-b border-border"
                onClick={() => { setMenuOpen(false); onBeenThere?.(reco) }}
              >
                <div className="font-semibold text-white">🔄 Been there, done that</div>
                <div className="text-[11px] text-white/60 mt-0.5">Already done this — rate it or request something new</div>
              </button>
              <button
                className="w-full text-left px-4 py-3 text-[13px] hover:bg-bg-card transition-colors"
                onClick={() => { setMenuOpen(false); onNoGo?.(reco) }}
              >
                <div className="font-semibold text-bad">🚫 No go</div>
                <div className="text-[11px] text-white/60 mt-0.5">Can't or won't do this — give them a reason</div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Title + Reco'd by + pills — bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 16px 24px', zIndex: 10 }}>
        <div className={`font-black text-white leading-[1.05] tracking-[-1px] line-clamp-2 ${
          reco.title.length > 30 ? 'text-[26px]' :
          reco.title.length > 18 ? 'text-[32px]' :
          'text-[40px]'
        }`}>
          {reco.title}
        </div>
        {(recommenderNames || when) && (
          <div className="text-[14px] text-white/75 mt-2">
            Reco'd by {recommenderNames}{when ? ` · ${when}` : ''}
          </div>
        )}
        {details.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {details.map((d, i) => {
              const pillClass = "flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.5px] px-[9px] py-1 rounded-chip border border-accent/50 bg-accent/10 text-accent"
              const mapsHref = d.key === 'address'
                ? `https://www.google.com/maps/search/?q=${encodeURIComponent([reco.title, d.value, reco.meta?.location].filter(Boolean).join(', '))}`
                : null
              return mapsHref
                ? <a key={i} href={mapsHref} target="_blank" rel="noopener noreferrer" className={pillClass}>{DETAIL_ICON[d.key]}{d.value}</a>
                : <span key={i} className={pillClass}>{DETAIL_ICON[d.key]}{d.value}</span>
            })}
          </div>
        )}
      </div>
    </div>
  ) : (
    // No-image compact dormant
    <div className="bg-bg-card border border-border rounded-card px-4 py-4 cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('a, button')) return; open() }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-1.5"><CategoryDot category={reco.category} /></div>
          <div className="text-[22px] font-semibold text-white tracking-[-0.5px] leading-[1.1] mb-1">{reco.title}</div>
          {(recommenderNames || when) && (
            <div className="text-[12px] text-text-faint">Reco'd by {recommenderNames}{when ? ` · ${when}` : ''}</div>
          )}
        </div>
        <div className="relative flex-shrink-0">
          <button
            className="flex gap-[4px] items-center pt-1 p-1"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o) }}
          >
            {[0, 1, 2].map((i) => <div key={i} className="w-[5px] h-[5px] rounded-full bg-text-faint" />)}
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 z-20 bg-bg-elevated border border-border rounded-input overflow-hidden shadow-xl min-w-[200px]"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="w-full text-left px-4 py-3 text-[13px] text-text-secondary hover:bg-bg-card transition-colors border-b border-border"
                onClick={() => { setMenuOpen(false); onBeenThere?.(reco) }}
              >
                <div className="font-semibold text-white">Been there, done that</div>
                <div className="text-[11px] text-text-faint mt-0.5">Already done this — rate it or request something new</div>
              </button>
              <button
                className="w-full text-left px-4 py-3 text-[13px] hover:bg-bg-card transition-colors"
                onClick={() => { setMenuOpen(false); onNoGo?.(reco) }}
              >
                <div className="font-semibold text-bad">No go</div>
                <div className="text-[11px] text-text-faint mt-0.5">Can't or won't do this — give them a reason</div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // ─── Expanded sheet ──────────────────────────────────────────────────────────

  return (
    <>
      {dormant}

      {expanded && (
        <>
          {/* Backdrop — only close when tapping the backdrop itself, not children */}
          <div
            className={cn('fixed inset-0 z-40 bg-black transition-opacity duration-300', animating ? 'opacity-60' : 'opacity-0')}
            onClick={(e) => { if (e.target === e.currentTarget) close() }}
          />

          {/* Sheet — constrained to phone width on desktop */}
          <div
            className={cn(
              'fixed bottom-0 left-1/2 -translate-x-1/2 z-50 w-full max-w-[390px] bg-bg-card rounded-t-[24px] overflow-y-auto transition-transform duration-300 ease-out',
              animating ? 'translate-y-0' : 'translate-y-full'
            )}
            style={{ maxHeight: '92dvh' }}
            onPointerDown={(e) => { ptrDown.current = { x: e.clientX, y: e.clientY } }}
            onPointerUp={(e) => {
              if (!ptrDown.current) return
              const moved = Math.abs(e.clientX - ptrDown.current.x) + Math.abs(e.clientY - ptrDown.current.y)
              ptrDown.current = null
              if (moved < 8) close()
            }}
          >
            {/* Image with back button overlaid */}
            <div className="relative">
              {hasImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={reco.meta.artwork_url!} alt={reco.title} className="w-full h-[220px] object-cover rounded-t-[24px]" />
              )}
              {/* Back button — top-left over image */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); close() }}
                className="absolute top-4 left-4 flex items-center gap-1.5 text-[13px] font-semibold text-white bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-chip"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Back
              </button>
            </div>

            {/* Content — no stopPropagation so tapping anywhere closes the sheet */}
            <div className="px-4 pt-4 pb-8">
              {/* Back button when no image */}
              {!hasImage && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); close() }}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary mb-3"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 5l-7 7 7 7" />
                  </svg>
                  Back
                </button>
              )}

              {/* Category dot */}
              <div className="flex justify-end mb-3">
                <CategoryDot category={reco.category} />
              </div>

              {/* Title */}
              {primaryLink ? (
                <a href={primaryLink} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="text-[28px] font-semibold text-white tracking-[-0.7px] leading-[1.05] mb-1 block">
                  {reco.title}
                </a>
              ) : (
                <div className="text-[28px] font-semibold text-white tracking-[-0.7px] leading-[1.05] mb-1">
                  {reco.title}
                </div>
              )}

              {/* Spotify pill */}
              {(reco.category === 'podcast' || reco.category === 'music') && reco.meta?.artwork_url && (
                <div className="mb-2"><SpotifyPill /></div>
              )}

              {/* Meta pills (date, location) */}
              <div className="flex items-center gap-1.5 flex-wrap mb-3">
                {reco.meta?.streaming_service && <MetaPill icon="tv">{reco.meta.streaming_service}</MetaPill>}
                {reco.created_at && (
                  <MetaPill icon="calendar">
                    {(() => {
                      const days = Math.floor((Date.now() - new Date(reco.created_at).getTime()) / 86400000)
                      return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`
                    })()}
                  </MetaPill>
                )}
                {reco.meta?.location && <MetaPill icon="pin">{reco.meta.location}</MetaPill>}
                {reco.meta?.instagram && <MetaPill icon="instagram">@{reco.meta.instagram.replace('@', '')}</MetaPill>}
                {(reco.meta?.location || reco.meta?.address) && (
                  <a
                    href={`https://www.google.com/maps/search/?q=${encodeURIComponent([reco.title, reco.meta?.address, reco.meta?.location].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MetaPill icon="map">Map</MetaPill>
                  </a>
                )}
              </div>

              {/* Reco'd by */}
              <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5">Reco'd by</div>
              <div className="flex flex-wrap gap-[5px] mb-3">
                {reco.recommenders?.map((rec) => (
                  <span key={rec.profile.id} className="text-[11px] font-medium px-2.5 py-1 rounded-chip border border-border cursor-pointer text-text-secondary">
                    {rec.profile.display_name.split(' ')[0]}
                  </span>
                ))}
                {(reco.recommenders?.length ?? 0) > 3 && (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-chip border border-[#222226] text-text-faint cursor-pointer">
                    +{(reco.recommenders?.length ?? 0) - 3} others
                  </span>
                )}
              </div>

              {/* Why */}
              <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-2">Why?</div>
              {details.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {details.map((d, i) => (
                    <span key={i} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.5px] px-[9px] py-1 rounded-chip border border-accent/50 bg-accent/10 text-accent">
                      {DETAIL_ICON[d.key]}
                      {d.value}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-[13px] text-text-secondary leading-[1.5] min-h-[36px]">{currentWhy}</div>

              {/* Why nav dots — stopPropagation so navigation doesn't close sheet */}
              {whyMessages.length > 1 && (
                <div className="flex items-center gap-2 mt-1.5 mb-3">
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setWhyIndex((i) => (i - 1 + whyMessages.length) % whyMessages.length) }}
                    className="text-[15px] text-text-faint w-[22px] h-[22px] flex items-center justify-center rounded-full border border-border">‹</button>
                  {whyMessages.map((_, i) => (
                    <span key={i} className={cn('w-1 h-1 rounded-full transition-colors', i === whyIndex ? 'bg-text-secondary' : 'bg-border')} />
                  ))}
                  <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setWhyIndex((i) => (i + 1) % whyMessages.length) }}
                    className="text-[15px] text-text-faint w-[22px] h-[22px] flex items-center justify-center rounded-full border border-border">›</button>
                </div>
              )}
              {whyMessages.length <= 1 && <div className="mb-3" />}

              {/* Links — stopPropagation so tapping a link navigates without closing */}
              {(reco.meta?.links?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  {reco.meta!.links!.map((link, i) => (
                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent underline underline-offset-2">
                      {getLinkLabel(link)}
                    </a>
                  ))}
                </div>
              )}

              {/* Done button — stopPropagation so it runs its action, not just close */}
              {reco.status !== 'done' && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onMarkDone?.(reco) }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-input text-[13px] font-semibold text-text-muted hover:border-accent hover:text-accent transition-colors mt-1"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="8" r="7" /><path d="M5 8l2.5 2.5L11 5.5" />
                  </svg>
                  Done? Give them your review
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaPill({ icon, children, onClick, color }: {
  icon: 'tv' | 'calendar' | 'pin' | 'instagram' | 'map'
  children: React.ReactNode
  onClick?: () => void
  color?: string
}) {
  return (
    <span
      onClick={onClick}
      className={cn('text-[11px] font-medium px-2 py-[3px] rounded-md bg-bg-card flex items-center gap-1', onClick ? 'cursor-pointer' : '')}
      style={{ color: color ?? '#909099' }}
    >
      <MetaIcon type={icon} color={color} />
      {children}
    </span>
  )
}

function MetaIcon({ type, color }: { type: string; color?: string }) {
  const stroke = color ?? '#909099'
  if (type === 'tv') return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>
  if (type === 'calendar') return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  if (type === 'pin') return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
  if (type === 'instagram') return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
  if (type === 'map') return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/></svg>
  return null
}

function SpotifyPill() {
  return (
    <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-spotify-bg text-spotify w-fit">
      <svg width="9" height="9" viewBox="0 0 24 24" fill="#1DB954">
        <circle cx="12" cy="12" r="12"/>
        <path d="M6 9.6C9.3 7.5 14.9 7.8 18 10l-.9 1.5C15 9.7 10.2 9.4 7.2 11.3L6 9.6zm-.5 3.3C9.8 10.3 16.6 10.7 20 13.5l-.9 1.4C16 12.3 9.9 12 6.7 14.3l-1.2-1.4zm1 3.2c3-2 8.1-1.7 11 .5l-.9 1.3c-2.5-1.9-7-2.1-9.6-.4l-.5-1.4z" fill="#0a1f0e"/>
      </svg>
      Open in Spotify
    </span>
  )
}
