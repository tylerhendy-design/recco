import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!q || !key) return new NextResponse(null, { status: 400 })

  const styles = [
    'style=feature:all|element:geometry|color:0x1a1a2e',
    'style=feature:all|element:labels.text.fill|color:0xcccccc',
    'style=feature:all|element:labels.text.stroke|color:0x0a0a0c',
    'style=feature:water|color:0x0e1e2e',
    'style=feature:road|color:0x2a2a3e',
    'style=feature:poi|visibility:off',
  ].join('&')

  const url = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(q)}&zoom=15&size=600x300&scale=2&maptype=roadmap&markers=color:0xD4E23A%7C${encodeURIComponent(q)}&${styles}&key=${key}`

  const res = await fetch(url)

  // Static Maps returns 200 even for errors (sends an error image)
  // Check content type — errors sometimes come as text/html
  const contentType = res.headers.get('content-type') ?? ''
  if (!res.ok || contentType.includes('text/html')) {
    return new NextResponse(null, { status: 502 })
  }

  const buffer = await res.arrayBuffer()

  // Google's error images are very small (~700 bytes) — real maps are 10KB+
  if (buffer.byteLength < 2000) {
    return new NextResponse(null, { status: 502 })
  }

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': contentType || 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
