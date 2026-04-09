import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

type ParsedPlace = {
  name: string
  address: string | null
  city: string | null
  imageUrl: string | null
  website: string | null
  mapsUrl: string | null
  placeId: string | null
}

export async function POST(req: NextRequest) {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, text } = await req.json()
  const key = process.env.GOOGLE_PLACES_API_KEY

  const places: ParsedPlace[] = []

  // Mode 1: Google Maps list URL
  if (url && (url.includes('google.com/maps') || url.includes('goo.gl') || url.includes('maps.app.goo.gl'))) {
    try {
      // Resolve short URL to full URL
      let resolvedUrl = url
      if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
        const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': DESKTOP_UA } })
        resolvedUrl = r.url
      }

      // Fetch the page HTML to extract place names
      const res = await fetch(resolvedUrl, { headers: { 'User-Agent': DESKTOP_UA } })
      const html = await res.text()

      // Extract place names from the HTML — Google Maps list pages have structured data
      // Try multiple patterns:

      // Pattern 1: Place names in data attributes or meta tags
      const placeMatches = html.matchAll(/data-item-id="([^"]+)"[^>]*>([^<]+)/g)
      for (const match of placeMatches) {
        if (match[2]?.trim()) {
          places.push({ name: match[2].trim(), address: null, city: null, imageUrl: null, website: null, mapsUrl: null, placeId: match[1] || null })
        }
      }

      // Pattern 2: Place names from aria-labels on list items
      if (places.length === 0) {
        const ariaMatches = html.matchAll(/aria-label="([^"]{3,80})"/g)
        const seen = new Set<string>()
        for (const match of ariaMatches) {
          const name = match[1].trim()
          // Filter out UI labels
          if (name.includes('Search') || name.includes('Menu') || name.includes('Google') || name.includes('Share') || name.includes('Close')) continue
          if (seen.has(name.toLowerCase())) continue
          seen.add(name.toLowerCase())
          places.push({ name, address: null, city: null, imageUrl: null, website: null, mapsUrl: null, placeId: null })
        }
      }

      // Pattern 3: og:title might have the list title
      // Pattern 4: Extract from JSON-LD if present
      if (places.length === 0) {
        const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)
        for (const match of jsonLdMatches) {
          try {
            const data = JSON.parse(match[1])
            if (data.itemListElement) {
              for (const item of data.itemListElement) {
                if (item.name) {
                  places.push({ name: item.name, address: null, city: null, imageUrl: null, website: null, mapsUrl: item.url || null, placeId: null })
                }
              }
            }
          } catch {}
        }
      }
    } catch {}
  }

  // Mode 2: Plain text — one place per line
  if (text) {
    const lines = text.split(/[\n,;]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 2)
    for (const line of lines) {
      // Skip URLs on their own
      if (line.startsWith('http')) continue
      places.push({ name: line, address: null, city: null, imageUrl: null, website: null, mapsUrl: null, placeId: null })
    }
  }

  // Enrich each place with Google Places data
  if (key && places.length > 0) {
    const enriched = await Promise.all(
      places.slice(0, 20).map(async (place) => {
        try {
          // Search by name
          const searchRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(place.name)}&inputtype=textquery&fields=place_id,name,formatted_address,photos,geometry&key=${key}`
          )
          const searchData = await searchRes.json()
          const candidate = searchData.candidates?.[0]
          if (!candidate) return place

          // Extract city from address
          const addressParts = (candidate.formatted_address ?? '').split(',').map((p: string) => p.trim())
          const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : null

          // Get photo
          let imageUrl = null
          const photoRef = candidate.photos?.[0]?.photo_reference
          if (photoRef) {
            const photoRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${key}`,
              { redirect: 'follow' }
            )
            imageUrl = photoRes.url
          }

          // Get website
          let website = null
          if (candidate.place_id) {
            const detailRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/details/json?place_id=${candidate.place_id}&fields=website&key=${key}`
            )
            const detail = await detailRes.json()
            website = detail.result?.website ?? null
          }

          const mapsQuery = [candidate.name, candidate.formatted_address].filter(Boolean).join(', ')

          return {
            name: candidate.name ?? place.name,
            address: candidate.formatted_address ?? null,
            city,
            imageUrl,
            website,
            mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
            placeId: candidate.place_id ?? null,
          }
        } catch {
          return place
        }
      })
    )
    return NextResponse.json({ places: enriched })
  }

  return NextResponse.json({ places })
}
