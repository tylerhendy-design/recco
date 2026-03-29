import { NextRequest, NextResponse } from 'next/server'

export interface SearchResult {
  title: string
  subtitle: string | null
  imageUrl: string | null
}

// ─── TMDB ────────────────────────────────────────────────────────────────────

async function searchTMDB(q: string, type: 'movie' | 'tv'): Promise<SearchResult[]> {
  const key = process.env.TMDB_API_KEY
  if (!key) return []
  const res = await fetch(
    `https://api.themoviedb.org/3/search/${type}?api_key=${key}&query=${encodeURIComponent(q)}&page=1&include_adult=false`,
    { next: { revalidate: 0 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const seen = new Set<string>()
  return (data.results ?? [])
    .map((r: any) => {
      const title = type === 'movie' ? r.title : r.name
      const year = (type === 'movie' ? r.release_date : r.first_air_date)?.slice(0, 4) ?? null
      return {
        title: title ?? null,
        subtitle: year,
        imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w200${r.poster_path}` : null,
      }
    })
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 5)
}

// ─── Spotify ─────────────────────────────────────────────────────────────────

let spotifyToken: string | null = null
let spotifyTokenExpiry = 0

async function getSpotifyToken(): Promise<string | null> {
  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret) return null
  if (spotifyToken && Date.now() < spotifyTokenExpiry) return spotifyToken

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) return null
  const data = await res.json()
  spotifyToken = data.access_token
  spotifyTokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return spotifyToken
}

async function searchSpotify(q: string, type: 'album' | 'show'): Promise<SearchResult[]> {
  const token = await getSpotifyToken()
  if (!token) return []
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=8`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const items = type === 'album' ? data.albums?.items : data.shows?.items
  const seen = new Set<string>()
  return (items ?? [])
    .map((r: any) => ({
      title: r.name ?? null,
      subtitle: type === 'album' ? (r.artists?.[0]?.name ?? null) : (r.publisher ?? null),
      imageUrl: r.images?.[0]?.url ?? null,
    }))
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 5)
}

// ─── iTunes (free fallback) ───────────────────────────────────────────────────

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
  if (!res.ok) return []
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

// ─── Open Library (books) ────────────────────────────────────────────────────

async function searchBooks(q: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=7&fields=title,author_name,cover_i`,
    { headers: { 'User-Agent': 'RECO-App/1.0 (contact@givemeareco.com)' } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const seen = new Set<string>()
  return (data.docs ?? [])
    .map((b: any) => ({
      title: b.title ?? null,
      subtitle: b.author_name?.[0] ?? null,
      imageUrl: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
    }))
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 5)
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const category = req.nextUrl.searchParams.get('category')

  if (!q || q.length < 2) return NextResponse.json([])

  try {
    switch (category) {
      case 'film': {
        const tmdb = await searchTMDB(q, 'movie')
        if (tmdb.length) return NextResponse.json(tmdb)
        return NextResponse.json(
          await searchITunes(q, 'movie', 'movie', r => r.trackName ?? null, r => r.releaseDate?.slice(0, 4) ?? null)
        )
      }

      case 'tv': {
        const tmdb = await searchTMDB(q, 'tv')
        if (tmdb.length) return NextResponse.json(tmdb)
        return NextResponse.json(
          await searchITunes(q, 'tvShow', 'tvSeason', r => r.artistName ?? null, r => r.primaryGenreName ?? null)
        )
      }

      case 'music': {
        const spotify = await searchSpotify(q, 'album')
        if (spotify.length) return NextResponse.json(spotify)
        return NextResponse.json(
          await searchITunes(q, 'music', 'album', r => r.collectionName ?? r.trackName ?? null, r => r.artistName ?? null)
        )
      }

      case 'podcast': {
        const spotify = await searchSpotify(q, 'show')
        const itunes = await searchITunes(q, 'podcast', 'podcast', r => r.collectionName ?? null, r => r.artistName ?? null)
        // Merge: Spotify first, then iTunes results not already present
        const titles = new Set(spotify.map(r => r.title.toLowerCase()))
        const merged = [...spotify, ...itunes.filter(r => !titles.has(r.title.toLowerCase()))]
        return NextResponse.json(merged.slice(0, 6))
      }

      case 'book':
        return NextResponse.json(await searchBooks(q))

      default:
        return NextResponse.json([])
    }
  } catch {
    return NextResponse.json([])
  }
}
