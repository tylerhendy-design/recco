import { NextRequest, NextResponse } from 'next/server'

// Fetches a Google Places photo URL server-side so the API key is never exposed.
// Strategy: call the photo API, follow the redirect, return the final CDN URL
// (which is a Google-hosted image with no key in the URL).
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id')
  const textQuery = req.nextUrl.searchParams.get('q')
  const key = process.env.GOOGLE_PLACES_API_KEY
  if ((!placeId && !textQuery) || !key) return NextResponse.json({ photoUrl: null })

  try {
    let photoRef: string | null = null

    if (placeId) {
      // Direct place_id lookup
      const detailsRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${key}`
      )
      if (detailsRes.ok) {
        const details = await detailsRes.json()
        photoRef = details.result?.photos?.[0]?.photo_reference ?? null
      }
    }

    if (!photoRef && textQuery) {
      // Text search fallback — find the place by name
      const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(textQuery)}&inputtype=textquery&fields=photos&key=${key}`
      )
      if (searchRes.ok) {
        const searchData = await searchRes.json()
        photoRef = searchData.candidates?.[0]?.photos?.[0]?.photo_reference ?? null
      }
    }

    if (!photoRef) return NextResponse.json({ photoUrl: null })

    // Step 2: follow the Places Photo redirect to get the real CDN URL (no key in it)
    const photoRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${photoRef}&key=${key}`,
      { redirect: 'follow' }
    )
    if (!photoRes.ok) return NextResponse.json({ photoUrl: null })

    // The final URL after redirect is a Google CDN URL with no API key
    return NextResponse.json({ photoUrl: photoRes.url })
  } catch {
    return NextResponse.json({ photoUrl: null })
  }
}
