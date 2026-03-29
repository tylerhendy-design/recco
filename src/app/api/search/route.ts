import { NextRequest, NextResponse } from 'next/server'

export interface SearchResult {
  title: string
  subtitle: string | null
  imageUrl: string | null
}

async function searchBooks(q: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=7&fields=title,author_name,cover_i`,
    { headers: { 'User-Agent': 'RECO-App/1.0 (contact@givemeareco.com)' } }
  )
  const data = await res.json()
  const seen = new Set<string>()
  return (data.docs ?? [])
    .map((b: any) => ({
      title: b.title ?? null,
      subtitle: b.author_name?.[0] ?? null,
      imageUrl: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
    }))
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title))
    .slice(0, 5)
}

async function searchITunes(
  q: string,
  media: string,
  entity: string,
  titleKey: (r: any) => string | null,
  subtitleKey: (r: any) => string | null
): Promise<SearchResult[]> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=${media}&entity=${entity}&limit=10`
  )
  const data = await res.json()
  const seen = new Set<string>()
  return (data.results ?? [])
    .map((r: any) => ({
      title: titleKey(r),
      subtitle: subtitleKey(r),
      imageUrl: r.artworkUrl100 ?? r.artworkUrl60 ?? null,
    }))
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 5)
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const category = req.nextUrl.searchParams.get('category')

  if (!q || q.length < 2) return NextResponse.json([])

  try {
    switch (category) {
      case 'book':
        return NextResponse.json(await searchBooks(q))

      case 'film':
        return NextResponse.json(
          await searchITunes(q, 'movie', 'movie',
            r => r.trackName ?? null,
            r => r.primaryGenreName ?? null
          )
        )

      case 'tv':
        return NextResponse.json(
          await searchITunes(q, 'tvShow', 'tvSeason',
            r => r.artistName ?? null,          // artistName = show name
            r => r.primaryGenreName ?? null
          )
        )

      case 'music':
        return NextResponse.json(
          await searchITunes(q, 'music', 'album',
            r => r.collectionName ?? r.trackName ?? null,
            r => r.artistName ?? null
          )
        )

      case 'podcast':
        return NextResponse.json(
          await searchITunes(q, 'podcast', 'podcast',
            r => r.collectionName ?? r.trackName ?? null,
            r => r.artistName ?? null
          )
        )

      default:
        return NextResponse.json([])
    }
  } catch {
    return NextResponse.json([])
  }
}
