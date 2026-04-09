import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const maxDuration = 60 // Allow up to 60s for browser rendering

type ParsedPlace = {
  name: string
  address: string | null
  city: string | null
  imageUrl: string | null
  website: string | null
  mapsUrl: string | null
  placeId: string | null
}

// ── Headless browser: render the Google Maps page and extract place names ──
async function extractPlacesWithBrowser(url: string): Promise<string[]> {
  let browser = null
  try {
    const chromium = (await import('@sparticuz/chromium')).default
    const puppeteer = (await import('puppeteer-core')).default

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')

    // Navigate to the URL (follows redirects automatically)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for list items to render — Google Maps uses various selectors
    await page.waitForSelector('[role="main"]', { timeout: 10000 }).catch(() => {})
    // Give extra time for dynamic content
    await new Promise(r => setTimeout(r, 3000))

    // Extract place names from the rendered DOM
    const names = await page.evaluate(() => {
      const results: string[] = []
      const seen = new Set<string>()

      // Strategy 1: Place names in list item elements with specific font styling
      // Google Maps list items typically have the place name in a specific font-weight element
      document.querySelectorAll('[role="article"], [data-item-id], .fontHeadlineSmall, .fontBodyMedium').forEach(el => {
        const name = el.textContent?.trim()
        if (name && name.length > 2 && name.length < 80 && !seen.has(name.toLowerCase())) {
          seen.add(name.toLowerCase())
          results.push(name)
        }
      })

      // Strategy 2: Look for elements with aria-label containing place info
      if (results.length === 0) {
        document.querySelectorAll('a[aria-label]').forEach(el => {
          const label = el.getAttribute('aria-label') ?? ''
          if (label.length > 2 && label.length < 80) {
            const skip = ['directions', 'search', 'menu', 'share', 'google', 'close', 'zoom', 'map', 'satellite', 'layers', 'your location']
            if (!skip.some(s => label.toLowerCase().includes(s)) && !seen.has(label.toLowerCase())) {
              seen.add(label.toLowerCase())
              results.push(label)
            }
          }
        })
      }

      // Strategy 3: Look for the specific list item containers Google Maps uses
      if (results.length === 0) {
        document.querySelectorAll('div.fontHeadlineSmall, div[class*="fontHeadline"]').forEach(el => {
          const name = el.textContent?.trim()
          if (name && name.length > 2 && name.length < 80 && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase())
            results.push(name)
          }
        })
      }

      // Strategy 4: Broader search — look for repeated patterns of text elements that look like place names
      if (results.length === 0) {
        // Find all elements with specific text styling that Google Maps uses for place names
        document.querySelectorAll('span, div').forEach(el => {
          const style = window.getComputedStyle(el)
          const weight = parseInt(style.fontWeight)
          const size = parseInt(style.fontSize)
          // Place names are typically bold (500+) and medium-sized (14-20px)
          if (weight >= 500 && size >= 14 && size <= 22 && el.children.length === 0) {
            const name = el.textContent?.trim()
            if (name && name.length > 2 && name.length < 60 && !seen.has(name.toLowerCase())) {
              // Filter out obvious non-place text
              if (!/^(Map|Satellite|Layers|Search|Menu|Share|Close|Sign|Log|More|Review|Photo|Save|Direction)/i.test(name) &&
                  !/^\d+$/.test(name) && !/^[A-Z]{2,3}$/.test(name)) {
                seen.add(name.toLowerCase())
                results.push(name)
              }
            }
          }
        })
      }

      return results
    })

    await browser.close()
    return names
  } catch (e) {
    if (browser) await browser.close().catch(() => {})
    console.error('Browser extraction failed:', e)
    return []
  }
}

// ── Fallback: try simple HTML fetch patterns ──
async function extractPlacesFromHTML(url: string): Promise<string[]> {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  const names: string[] = []

  try {
    let resolvedUrl = url
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': UA } })
      resolvedUrl = r.url
    }

    const res = await fetch(resolvedUrl, { headers: { 'User-Agent': UA, 'Accept': 'text/html' } })
    const html = await res.text()

    // og:description often has place names for shared lists
    const ogDesc = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1]
      || html.match(/content="([^"]+)"\s+property="og:description"/)?.[1]
    if (ogDesc) {
      const cleaned = ogDesc.replace(/ and \d+ more.*$/, '').replace(/ and more.*$/, '')
      const parts = cleaned.split(/[,·•]/).map(s => s.trim()).filter(s => s.length > 2 && s.length < 60)
      if (parts.length >= 2) return parts
    }
  } catch {}

  return names
}

export async function POST(req: NextRequest) {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { url, text } = await req.json()
  const key = process.env.GOOGLE_PLACES_API_KEY

  let places: ParsedPlace[] = []

  // Mode 1: Google Maps URL — use headless browser to extract places
  if (url && (url.includes('google.com/maps') || url.includes('goo.gl') || url.includes('maps.app.goo.gl') || url.includes('maps.google'))) {
    // Try headless browser first (most reliable)
    let names = await extractPlacesWithBrowser(url)

    // Fallback to HTML parsing if browser failed
    if (names.length === 0) {
      names = await extractPlacesFromHTML(url)
    }

    for (const name of names) {
      places.push({ name, address: null, city: null, imageUrl: null, website: null, mapsUrl: null, placeId: null })
    }

    if (places.length === 0) {
      return NextResponse.json({
        places: [],
        error: 'Could not extract places from this link. The list may be private, or Google may be blocking automated access. Try making the list public in Google Maps settings.',
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
      places.slice(0, 30).map(async (place) => {
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
