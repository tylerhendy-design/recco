'use client'

import type { Reco } from '@/types/app.types'

/**
 * Shared location pill for reco cards.
 * Always shows the city (meta.location || meta.city), never the street address.
 * Links to Google Maps when tapped.
 * Consistent styling across all card views.
 */
export function getLocationCity(reco: Reco): string | null {
  const m = reco.meta ?? {}
  return (m.location as string | undefined)
    || (m.city as string | undefined)
    || (m.address as string | undefined)
    || null
}

export function hasLocation(reco: Reco): boolean {
  return !!getLocationCity(reco)
}

function getMapsUrl(reco: Reco): string {
  const m = reco.meta ?? {}
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [reco.title, m.address, m.location || m.city].filter(Boolean).join(', ')
  )}`
}

interface LocationPillProps {
  reco: Reco
  size?: 'sm' | 'default'
}

export function LocationPill({ reco, size = 'default' }: LocationPillProps) {
  const city = getLocationCity(reco)
  if (!city) return null

  const mapsUrl = getMapsUrl(reco)
  const isSm = size === 'sm'

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/8 text-accent font-semibold ${
        isSm ? 'text-[9px] px-2 py-0.5' : 'text-[10px] px-2.5 py-1'
      }`}
    >
      <svg width={isSm ? 8 : 10} height={isSm ? 8 : 10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      {city}
    </a>
  )
}
