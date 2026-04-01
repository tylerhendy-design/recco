'use client'

interface InteractiveMapProps {
  query: string
  className?: string
}

/**
 * Interactive Google Map — scrollable, pannable, zoomable.
 * Uses Maps Embed API proxied through /api/map-embed to keep API key server-side.
 * Dark mode via CSS filter on the embed.
 * Requires Maps Embed API enabled on the Google Cloud project.
 */
export function InteractiveMap({ query, className }: InteractiveMapProps) {
  return (
    <iframe
      className={className}
      style={{ border: 0, width: '100%', height: '100%' }}
      loading="lazy"
      allowFullScreen={false}
      src={`/api/map-embed?q=${encodeURIComponent(query)}`}
    />
  )
}
