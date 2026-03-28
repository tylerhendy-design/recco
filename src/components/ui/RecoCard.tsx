'use client'

import { useState } from 'react'
import { CategoryDot } from './CategoryDot'
import { cn } from '@/lib/utils'
import type { Reco } from '@/types/app.types'
import { getCategoryLabel } from '@/constants/categories'

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

function getDetailPills(reco: Reco): string[] {
  const m = reco.meta ?? {}
  const candidates: (string | undefined | null)[] = [
    m.location,
    m.artist,
    m.streaming_service,
    m.occasion,
    m.price,
    m.genre,
    m.mood,
    m.era,
    m.address,
  ]
  return candidates.filter(Boolean).slice(0, 3) as string[]
}

interface RecoCardProps {
  reco: Reco
  rank?: number
  onMarkDone?: (reco: Reco) => void
  onShowMap?: (reco: Reco) => void
}

export function RecoCard({ reco, onMarkDone, onShowMap }: RecoCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [whyIndex, setWhyIndex] = useState(0)

  const hasImage = !!reco.meta?.artwork_url

  // Build why messages array from recommenders
  const whyMessages = reco.recommenders
    ?.filter((r) => r.why_text)
    .map((r) => `${r.profile.display_name.split(' ')[0]}: "${r.why_text}"`) ?? []

  if (reco.why_text && whyMessages.length === 0) {
    whyMessages.push(reco.why_text)
  }

  const currentWhy = whyMessages[whyIndex] ?? reco.why_text ?? ''

  function prevWhy() {
    setWhyIndex((i) => (i - 1 + whyMessages.length) % whyMessages.length)
  }
  function nextWhy() {
    setWhyIndex((i) => (i + 1) % whyMessages.length)
  }

  // ─── Dormant state ──────────────────────────────────────────────────────────

  if (!expanded) {
    const recommenderNames = reco.recommenders
      ?.map((r) => r.profile.display_name.split(' ')[0])
      .slice(0, 2)
      .join(' & ') ?? ''
    const when = reco.created_at ? timeAgo(reco.created_at) : ''
    const details = getDetailPills(reco)

    if (hasImage) {
      return (
        <div
          className="relative rounded-card overflow-hidden cursor-pointer select-none"
          style={{ height: '300px' }}
          onClick={() => setExpanded(true)}
        >
          {/* Background image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reco.meta.artwork_url!}
            alt={reco.title}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.65) 60%, rgba(0,0,0,0.92) 100%)',
            }}
          />

          {/* Backdrop blur — fades in from middle */}
          <div
            className="absolute inset-0"
            style={{
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              maskImage: 'linear-gradient(to bottom, transparent 40%, black 75%)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent 40%, black 75%)',
            }}
          />

          {/* Second gradient on top of blur for darkness */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5) 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Top row */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <span
              className={cn('text-[11px] font-bold uppercase tracking-[1px] px-3 py-1.5 rounded-chip border', pillClasses(reco.category).bg, pillClasses(reco.category).border, pillClasses(reco.category).text)}
            >
              {getCategoryLabel(reco.category)}
            </span>
            <div className="flex gap-[5px] items-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-[7px] h-[7px] rounded-full bg-white opacity-80" />
              ))}
            </div>
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-10">
            {/* Title */}
            <div className="text-[40px] font-black text-white leading-none tracking-[-1px] mb-1">
              {reco.title}
            </div>

            {/* Reco'd by */}
            {(recommenderNames || when) && (
              <div className="text-[14px] text-white/75 mb-3">
                Reco'd by {recommenderNames}{when ? ` · ${when}` : ''}
              </div>
            )}

            {/* Detail pills */}
            {details.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {details.map((d, i) => (
                  <span
                    key={i}
                    className={cn('text-[11px] font-bold uppercase tracking-[0.5px] px-3 py-1.5 rounded-chip border', pillClasses(reco.category).bg, pillClasses(reco.category).border, pillClasses(reco.category).text)}
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    }

    // No image — compact dormant card
    return (
      <div
        className="bg-bg-card border border-border rounded-card px-4 py-4 cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-1.5">
              <CategoryDot category={reco.category} />
            </div>
            <div className="text-[22px] font-semibold text-white tracking-[-0.5px] leading-[1.1] mb-1">
              {reco.title}
            </div>
            {(recommenderNames || when) && (
              <div className="text-[12px] text-text-faint">
                Reco'd by {recommenderNames}{when ? ` · ${when}` : ''}
              </div>
            )}
          </div>
          <div className="flex gap-[4px] items-center pt-1 flex-shrink-0">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-[5px] h-[5px] rounded-full bg-text-faint" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Expanded state ─────────────────────────────────────────────────────────

  return (
    <div className="bg-bg-card border border-border rounded-card">
      {/* Full-width image banner */}
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={reco.meta.artwork_url!}
          alt={reco.title}
          className="w-full h-[190px] object-cover rounded-t-[16px]"
        />
      )}

      <div className="px-4 pt-4 pb-[18px]">
        {/* Top row — collapse button */}
        <div className="flex items-center justify-between mb-2">
          <CategoryDot category={reco.category} />
          <button
            onClick={() => setExpanded(false)}
            className="text-[11px] text-text-faint hover:text-text-secondary"
          >
            ▲ collapse
          </button>
        </div>

        {/* Title */}
        <div className="text-[26px] font-semibold text-white tracking-[-0.7px] leading-[1.05] mb-1">
          {reco.title}
        </div>

        {/* Spotify pill for music/podcast */}
        {(reco.category === 'podcast' || reco.category === 'music') && reco.meta?.artwork_url && (
          <div className="mb-1"><SpotifyPill /></div>
        )}

        {/* Meta pills */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
          {reco.meta?.streaming_service && (
            <MetaPill icon="tv">{reco.meta.streaming_service}</MetaPill>
          )}
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
          {reco.meta?.location && onShowMap && (
            <MetaPill icon="map" onClick={() => onShowMap(reco)}>
              Map
            </MetaPill>
          )}
        </div>

        {/* Reco'd by */}
        <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5">
          Reco'd by
        </div>
        <div className="flex flex-wrap gap-[5px] mb-3">
          {reco.recommenders?.map((rec) => (
            <span
              key={rec.profile.id}
              className="text-[11px] font-medium px-2.5 py-1 rounded-chip border border-border cursor-pointer text-text-secondary"
            >
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
        <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-[5px]">
          Why?
        </div>
        <div className="text-[13px] text-text-secondary leading-[1.5] min-h-[36px]">
          {currentWhy}
        </div>

        {/* Why navigation dots */}
        {whyMessages.length > 1 && (
          <div className="flex items-center gap-2 mt-1.5 mb-3">
            <button
              onClick={prevWhy}
              className="text-[15px] text-text-faint w-[22px] h-[22px] flex items-center justify-center rounded-full border border-border hover:text-text-secondary"
            >
              ‹
            </button>
            {whyMessages.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'w-1 h-1 rounded-full transition-colors',
                  i === whyIndex ? 'bg-text-secondary' : 'bg-border'
                )}
              />
            ))}
            <button
              onClick={nextWhy}
              className="text-[15px] text-text-faint w-[22px] h-[22px] flex items-center justify-center rounded-full border border-border hover:text-text-secondary"
            >
              ›
            </button>
          </div>
        )}
        {whyMessages.length <= 1 && <div className="mb-3" />}

        {/* Links */}
        {(reco.meta?.links?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {reco.meta!.links!.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-accent underline underline-offset-2"
              >
                {getLinkLabel(link)}
              </a>
            ))}
          </div>
        )}

        {/* Done button */}
        {reco.status !== 'done' && (
          <button
            onClick={() => onMarkDone?.(reco)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-border rounded-input text-[13px] font-semibold text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="7" />
              <path d="M5 8l2.5 2.5L11 5.5" />
            </svg>
            Done? Give them your review
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetaPill({
  icon,
  children,
  onClick,
  color,
}: {
  icon: 'tv' | 'calendar' | 'pin' | 'instagram' | 'map'
  children: React.ReactNode
  onClick?: () => void
  color?: string
}) {
  return (
    <span
      onClick={onClick}
      className={cn(
        'text-[11px] font-medium px-2 py-[3px] rounded-md bg-bg-card flex items-center gap-1',
        onClick ? 'cursor-pointer' : '',
      )}
      style={{ color: color ?? '#909099' }}
    >
      <MetaIcon type={icon} color={color} />
      {children}
    </span>
  )
}

function MetaIcon({ type, color }: { type: string; color?: string }) {
  const stroke = color ?? '#909099'
  if (type === 'tv') return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>
    </svg>
  )
  if (type === 'calendar') return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
  if (type === 'pin') return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
  if (type === 'instagram') return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
  if (type === 'map') return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
    </svg>
  )
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
