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
      let resolvedUrl = url
      let pageHtml: string | null = null

      // Follow short URL redirect and grab the HTML in one request
      if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
        const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
        resolvedUrl = r.url
        try { pageHtml = await r.text() } catch {}
      }

      // Extract place name from URL path /maps/place/NAME/@lat,lon
      const placeMatch = resolvedUrl.match(/\/maps\/place\/([^/@?]+)/)
      let placeName: string | null = placeMatch
        ? decodeURIComponent(placeMatch[1].replace(/\+/g, ' '))
        : null

      // Fallback: try OG title from the page HTML
      if (!placeName && pageHtml) {
        const og = await extractOgTags(pageHtml)
        // OG title on Maps is usually "Place Name - Google Maps"
        placeName = og.title?.replace(/\s*[-–|].*Google Maps.*$/i, '').trim() ?? null
      }

      // Fallback: fetch the long URL page if we only have the redirect target
      if (!placeName && resolvedUrl.includes('google.com/maps')) {
        try {
          const r2 = await fetch(resolvedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
          const html = await r2.text()
          const og = await extractOgTags(html)
          placeName = og.title?.replace(/\s*[-–|].*Google Maps.*$/i, '').trim() ?? null
        } catch {}
      }

      // Extract coordinates
      const coordMatch = resolvedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
      let city: string | null = null
      let country: string | null = null
      let address: string | null = null

      if (coordMatch) {
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
