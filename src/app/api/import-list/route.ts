import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const maxDuration = 60

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

type ParsedPlace = {
  name: string
  address: string | null
  city: string | null
  imageUrl: string | null
  website: string | null
  mapsUrl: string | null
  placeId: string | null
}

/**
 * Google Maps embeds place data in the HTML as large JS arrays within script tags.
 * Place names appear in predictable patterns alongside hex place IDs.
 * This function extracts those names without needing a headless browser.
 */
function extractPlaceNamesFromHTML(html: string): string[] {
  const names = new Set<string>()

  // Noise words to filter out — UI labels, not places
  const noise = new Set([
    'search google maps', 'google maps', 'directions', 'share', 'save',
    'close', 'menu', 'sign in', 'log in', 'send', 'cancel', 'ok',
    'satellite', 'layers', 'map', 'terrain', 'zoom in', 'zoom out',
    'your location', 'traffic', 'transit', 'biking', 'more', 'less',
    'report a problem', 'privacy', 'terms', 'about', 'feedback',
    'search', 'undo', 'redo', 'print', 'embed', 'suggest an edit',
  ])

  function isNoise(s: string): boolean {
    const lower = s.toLowerCase().trim()
    if (noise.has(lower)) return true
    // Filter out ratings like "4.5(154)" or "4.8 (2,301)"
    if (/^\d+\.\d+\s*\([\d,]+\)$/.test(s)) return true
    // Filter out pure numbers, postcodes, coordinates
    if (/^[\d.,\s-]+$/.test(s)) return true
    if (/^[A-Z]{1,2}\d{1,2}\s?\d[A-Z]{2}$/i.test(s)) return true
    // Filter out very short or very long strings
    if (s.length < 3 || s.length > 80) return false
    // Filter out URLs
    if (s.startsWith('http') || s.includes('.com') || s.includes('.co.')) return true
    return false
  }

  // Strategy 1: Google embeds place data as arrays with hex IDs
  // Pattern: "0x...","Place Name" or null,"Place Name"
  // These appear in the initial state data within script tags
  for (const m of html.matchAll(/"0x[a-f0-9]+:0x[a-f0-9]+"[^"]*"([^"]{3,60})"/g)) {
    const name = m[1].trim()
    if (!isNoise(name) && !names.has(name.toLowerCase())) {
      names.add(name)
    }
  }

  // Strategy 2: Place names in escaped JSON within script data
  // Google often uses: \\\"Place Name\\\" patterns
  for (const m of html.matchAll(/\\\\?"(0x[a-f0-9]+:0x[a-f0-9]+)\\\\?"[,\]]*\\\\?"([^\\\"]{3,60})\\\\?"/g)) {
    const name = m[2].trim()
    if (!isNoise(name) && !names.has(name.toLowerCase())) {
      names.add(name)
    }
  }

  // Strategy 3: Look for arrays with place data structure
  // Google embeds data like: [null,null,null,"Place Name",null,"Address"]
  // where place names typically follow a hex ID or appear at specific indices
  for (const m of html.matchAll(/\[(?:"0x[a-f0-9:]+"|null),(?:null,)*"([^"]{3,60})",(?:null,)*"([^"]{5,120})"/g)) {
    const name = m[1].trim()
    if (!isNoise(name) && !names.has(name.toLowerCase())) {
      names.add(name)
    }
  }

  // Strategy 4: og:description — Google often includes place names here for shared lists
  const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1]
    || html.match(/content="([^"]+)"\s+property="og:description"/)?.[1]
  if (ogDesc && names.size === 0) {
    const cleaned = ogDesc
      .replace(/\s+and \d+ more.*$/, '')
      .replace(/\s+and more.*$/, '')
      .replace(/^.*?:\s*/, '') // Remove prefix like "Saved places: "
    const parts = cleaned.split(/[,·•|]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 60)
    if (parts.length >= 2) {
      for (const p of parts) {
        if (!isNoise(p)) names.add(p)
      }
    }
  }

  // Strategy 5: title tag sometimes has the list name
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]

  // Strategy 6: Look for place-like patterns near rating patterns
  // Pattern: "Place Name"... "4.5" or "Place Name"..."stars"
  for (const m of html.matchAll(/"([A-Z][^"]{2,50})"[^"]{0,200}?"(\d\.\d)"/g)) {
    const name = m[1].trim()
    if (!isNoise(name) && !names.has(name.toLowerCase()) && !/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(name)) {
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

  // Mode 1: Google Maps URL
  if (url && (url.includes('google.com/maps') || url.includes('goo.gl') || url.includes('maps.app.goo.gl') || url.includes('maps.google'))) {
    try {
      // Resolve short URL to full URL
      let resolvedUrl = url
      if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
        const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } })
        resolvedUrl = r.url
      }

      // Fetch the page HTML
      const res = await fetch(resolvedUrl, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'en-US,en;q=0.9' },
      })
      const html = await res.text()

      // Extract place names from the embedded data
      const names = extractPlaceNamesFromHTML(html)

      for (const name of names) {
        places.push({ name, address: null, city: null, imageUrl: null, website: null, mapsUrl: null, placeId: null })
      }

      if (places.length === 0) {
        // Return the resolved URL so user can debug, plus the HTML size for diagnostics
        return NextResponse.json({
          places: [],
          error: `Could not extract places from this list. The link resolved to: ${resolvedUrl.substring(0, 100)}... (${Math.round(html.length / 1024)}KB HTML). The list may need to be set to "public" in Google Maps, or Google may be blocking server access. Try the manual option below.`,
        })
      }
    } catch (e: any) {
      return NextResponse.json({
        places: [],
        error: `Failed to read the link: ${e.message ?? 'network error'}. Check the URL is correct.`,
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

  // Enrich each place with Google Places data (up to 50 at a time)
  if (key && places.length > 0) {
    const enriched = await Promise.all(
      places.slice(0, 50).map(async (place) => {
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
