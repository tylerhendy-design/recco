import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!q || !key) return new NextResponse('Missing query', { status: 400 })

  // Serve an HTML page that embeds the Google Map
  // This keeps the API key server-side (in the rendered HTML, not in client JS)
  const html = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; }
  iframe { width: 100%; height: 100%; border: 0; filter: invert(90%) hue-rotate(180deg) brightness(0.95) contrast(1.1); }
</style>
</head><body>
<iframe
  loading="lazy"
  allowfullscreen="false"
  referrerpolicy="no-referrer-when-downgrade"
  src="https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(q)}&zoom=15">
</iframe>
</body></html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
