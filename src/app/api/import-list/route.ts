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

// Extract place names from Google Maps SSR HTML using multiple strategies
function extractPlaceNames(html: string): string[] {
  const names = new Set<string>()

  // Strategy 1: data-item-id attributes
  for (const m of html.matchAll(/data-item-id="([^"]+)"[^>]*>([^<]+)/g)) {
    if (m[2]?.trim()) names.add(m[2].trim())
  }

  // Strategy 2: Escaped JSON strings containing place names in script data
  // Google Maps embeds data like: [null,"Place Name",null,null,"address"]
  // or ["0x...:0x...",null,"Place Name"]
  for (const m of html.matchAll(/\[(?:null,)*"(0x[a-f0-9]+:0x[a-f0-9]+)"(?:,null)*,"([^"]{2,60})"/g)) {
    if (m[2]?.trim()) names.add(m[2].trim())
  }

  // Strategy 3: Place names in \\\" escaped format within script tags
  for (const m of html.matchAll(/\\\\?"([A-Z][^\\\"]{2,50})\\\\?",\\\\?"([^\\\"]{5,100})\\\\?"/g)) {
    // name, address pairs
    if (m[1]?.trim() && !m[1].includes('http') && !m[1].includes('function')) {
      names.add(m[1].trim())
    }
  }

  // Strategy 4: aria-label attributes on list items
  if (names.size === 0) {
    const skip = new Set(['search', 'menu', 'google', 'share', 'close', 'back', 'directions', 'zoom', 'map', 'satellite', 'layers', 'send', 'save', 'label', 'review', 'photo', 'street view', 'your lists', 'more', 'options'])
    for (const m of html.matchAll(/aria-label="([^"]{3,80})"/g)) {
      const name = m[1].trim()
      if (skip.has(name.toLowerCase())) continue
      if (/^(Navigate|Open|Close|Show|Toggle|Expand|Collapse)/i.test(name)) continue
      names.add(name)
    }
  }

  // Strategy 5: JSON-LD structured data
  if (names.size === 0) {
    for (const m of html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/g)) {
      try {
        const data = JSON.parse(m[1])
        if (data.itemListElement) {
          for (const item of data.itemListElement) {
            if (item.name) names.add(item.name)
          }
        }
      } catch {}
    }
  }

  // Strategy 6: og:description often contains "List with N places: Place1, Place2, ..."
  const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1]
    || html.match(/content="([^"]+)"\s+property="og:description"/)?.[1]
  if (ogDesc) {
    // Extract place names from description like "Place1, Place2, Place3 and more"
    const cleaned = ogDesc.replace(/ and \d+ more.*$/, '').replace(/ and more.*$/, '')
    const parts = cleaned.split(/[,·•]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 60)
    if (parts.length >= 2) {
      for (const p of parts) names.add(p)
    }
  }

  // Strategy 7: Title patterns like "Place Name - Google Maps"
  // Google Maps list pages sometimes have place names in title/heading elements
  for (const m of html.matchAll(/<h[12345][^>]*>([^<]{3,60})<\/h[12345]>/g)) {
    const name = m[1].trim()
    if (!name.toLowerCase().includes('google') && !name.toLowerCase().includes('map')) {
      names.add(name)
    }
  }

  return [...names]
}

export async function POST(req: NextRequest) {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, text } = await req.json()
  const key = process.env.GOOGLE_PLACES_API_KEY

  let places: ParsedPlace[] = []

  // Mode 1: Google Maps list URL
  if (url && (url.includes('google.com/maps') || url.includes('goo.gl') || url.includes('maps.app.goo.gl') || url.includes('maps.google'))) {
    try {
      // Resolve short URL to full URL
      let resolvedUrl = url
      if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
        const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': DESKTOP_UA } })
        resolvedUrl = r.url
      }

      // Fetch the page HTML
      const res = await fetch(resolvedUrl, {
        headers: {
          'User-Agent': DESKTOP_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      })
      const html = await res.text()

      // Try to extract place names from the HTML
      const names = extractPlaceNames(html)
      for (const name of names) {
        places.push({ name, address: null, city: null, imageUrl: null, website: null, mapsUrl: null, placeId: null })
      }

      // If HTML parsing failed, try extracting from the URL itself
      // Some list URLs contain place data in the path or query params
      if (places.length === 0) {
        // Try parsing place names from URL path segments
        const decoded = decodeURIComponent(resolvedUrl)
        const placeMatch = decoded.match(/place\/([^/]+)/)
        if (placeMatch) {
          const name = placeMatch[1].replace(/\+/g, ' ')
          places.push({ name, address: null, city: null, imageUrl: null, website: null, mapsUrl: resolvedUrl, placeId: null })
        }
      }

      // Last resort: if we still have nothing but have a valid Google Maps URL,
      // return debug info so the user can try plain text input instead
      if (places.length === 0) {
        return NextResponse.json({
          places: [],
          hint: 'Google Maps list pages load content with JavaScript which we cannot parse server-side. Try opening the list in Google Maps, selecting all place names, and pasting them as text instead.',
          resolvedUrl,
        })
      }
    } catch (e: any) {
      return NextResponse.json({
        places: [],
        hint: `Could not fetch the URL: ${e.message ?? 'Unknown error'}. Check the link is correct and the list is public.`,
      })
    }
  }

  // Mode 2: Plain text — one place per line
  if (text) {
    const lines = text.split(/[\n,;]+/).map((l: string) => l.trim()).filter((l: string) => l.length > 2)
    for (const line of lines) {
      if (line.startsWith('http')) continue
      places.push({ name: line, address: null, city: null, imageUrl: null, website: null, mapsUrl: null, placeId: null })
    }
  }

  // Enrich each place with Google Places data
  if (key && places.length > 0) {
    const enriched = await Promise.all(
      places.slice(0, 20).map(async (place) => {
        try {
          const searchRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(place.name)}&inputtype=textquery&fields=place_id,name,formatted_address,photos,geometry&key=${key}`
          )
          const searchData = await searchRes.json()
          const candidate = searchData.candidates?.[0]
          if (!candidate) return place

          const addressParts = (candidate.formatted_address ?? '').split(',').map((p: string) => p.trim())
          const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : null

          let imageUrl = null
          const photoRef = candidate.photos?.[0]?.photo_reference
          if (photoRef) {
            const photoRes = await fetch(
              `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoRef}&key=${key}`,
              { redirect: 'follow' }
            )
            imageUrl = photoRes.url
          }

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
