import { NextRequest, NextResponse } from 'next/server'

async function extractOgTags(html: string) {
  const get = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`))
      ?? html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property="${prop}"`))
    return m?.[1] ?? null
  }
  return {
    title: get('og:title'),
    image: get('og:image'),
    description: get('og:description'),
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 })

  try {
    // ── Spotify ──────────────────────────────────────────────────────────────
    if (url.includes('spotify.com')) {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      if (!res.ok) return NextResponse.json({ error: 'Spotify not found' }, { status: 404 })
      const d = await res.json()
      return NextResponse.json({ type: 'music', title: d.title, artist: d.author_name, artworkUrl: d.thumbnail_url })
    }

    // ── Apple Music ───────────────────────────────────────────────────────────
    if (url.includes('music.apple.com')) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const html = await res.text()
      const og = await extractOgTags(html)
      // og:title is usually "Album Name - Artist" or "Song Name - Artist - Album"
      const parts = og.title?.split(' - ') ?? []
      const title = parts[0]?.trim() ?? null
      const artist = parts[1]?.trim() ?? null
      return NextResponse.json({ type: 'music', title, artist, artworkUrl: og.image })
    }

    // ── Apple Podcasts ────────────────────────────────────────────────────────
    if (url.includes('podcasts.apple.com')) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const html = await res.text()
      const og = await extractOgTags(html)
      const title = og.title?.split(' on Apple Podcasts')[0].trim() ?? null
      return NextResponse.json({ type: 'podcast', title, artist: null, artworkUrl: og.image })
    }

    // ── Google Maps ──────────────────────────────────────────────────────────
    if (url.includes('google.com/maps') || url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl')) {
      // Use a full desktop Chrome UA — Google serves different redirects based on UA
      const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

      let resolvedUrl = url

      // Follow short URL redirect with desktop UA to get the full /maps/place/ URL
      if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
        try {
          const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': DESKTOP_UA } })
          resolvedUrl = r.url
        } catch {}
      }

      // Extract place name from URL path /maps/place/NAME/@lat,lon
      const placeMatch = resolvedUrl.match(/\/maps\/place\/([^/@?]+)/)
      let placeName: string | null = placeMatch
        ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
        : null

      let city: string | null = null
      let country: string | null = null
      let address: string | null = null

      // Mobile share links redirect to /maps?q=Name,+Address,+City — parse the q param
      if (!placeName) {
        const qMatch = resolvedUrl.match(/[?&]q=([^&]+)/)
        if (qMatch) {
          const qDecoded = decodeURIComponent(qMatch[1].replace(/\+/g, ' '))
          const qParts = qDecoded.split(',').map(p => p.trim()).filter(Boolean)
          placeName = qParts[0] ?? null
          // qParts[1] = street address, qParts[2] = "City Postcode"
          if (qParts[1]) address = qParts[1]
          if (qParts[2]) city = qParts[2].replace(/\s+[A-Z]{1,2}\d[\dA-Z]?\s*\d[A-Z]{2}\s*$/i, '').trim() || qParts[2].trim()
        }
      }

      // Fallback: fetch the page and strip "… - Google Maps" from the OG title
      if (!placeName) {
        try {
          const r2 = await fetch(resolvedUrl, { headers: { 'User-Agent': DESKTOP_UA } })
          const html = await r2.text()
          const og = await extractOgTags(html)
          const raw = og.title?.replace(/\s*[-–]\s*Google Maps\s*$/i, '').trim() ?? ''
          // Reject if we just got "Google Maps" with no place name
          placeName = raw && raw.toLowerCase() !== 'google maps' ? raw : null
        } catch {}
      }

      // Extract coordinates for reverse geocoding (present in /maps/place/ URLs)
      const coordMatch = resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      if (coordMatch && !city) {
        const lat = coordMatch[1]
        const lon = coordMatch[2]
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { 'User-Agent': 'RECO-App/1.0 (contact@givemeareco.com)' } }
        )
        if (geoRes.ok) {
          const geo = await geoRes.json()
          city = geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? null
          country = geo.address?.country ?? null
          const parts = [geo.address?.road, geo.address?.house_number].filter(Boolean)
          address = parts.length > 0 ? parts.reverse().join(' ') : null
        }
      }

      return NextResponse.json({ type: 'place', title: placeName, city, country, address })
    }

    return NextResponse.json({ error: 'Unsupported URL' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
