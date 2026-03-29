import { NextRequest, NextResponse } from 'next/server'

export interface SearchResult {
  title: string
  subtitle: string | null   // year for film/TV, artist for music, author for books, address for restaurant
  imageUrl: string | null
  meta?: {
    genre?: string
    year?: string
    artist?: string
    author?: string
    address?: string
    city?: string
    place_id?: string
    website?: string
  }
}

// ─── TMDB genre maps ─────────────────────────────────────────────────────────

const MOVIE_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
  10752: 'War', 37: 'Western',
}

const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 10762: 'Kids', 9648: 'Mystery',
  10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 37: 'Western',
}

function firstGenre(ids: number[], map: Record<number, string>): string | undefined {
  for (const id of ids ?? []) if (map[id]) return map[id]
}

// ─── TMDB ────────────────────────────────────────────────────────────────────

async function searchTMDB(q: string, type: 'movie' | 'tv'): Promise<SearchResult[]> {
  const key = process.env.TMDB_API_KEY
  if (!key) return []
  const res = await fetch(
    `https://api.themoviedb.org/3/search/${type}?api_key=${key}&query=${encodeURIComponent(q)}&page=1&include_adult=false&language=en-US`
  )
  if (!res.ok) return []
  const data = await res.json()
  const genreMap = type === 'movie' ? MOVIE_GENRES : TV_GENRES
  const seen = new Set<string>()
  return (data.results ?? [])
    .map((r: any) => {
      const title = type === 'movie' ? r.title : r.name
      const year = (type === 'movie' ? r.release_date : r.first_air_date)?.slice(0, 4) ?? null
      const genre = firstGenre(r.genre_ids ?? [], genreMap)
      return {
        title: title ?? null,
        subtitle: [genre, year].filter(Boolean).join(' · ') || null,
        imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
        meta: { genre, year: year ?? undefined },
      }
    })
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 8)
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
    .map((r: any) => {
      const artist = type === 'album' ? (r.artists?.[0]?.name ?? null) : null
      return {
        title: r.name ?? null,
        subtitle: artist ?? (r.publisher ?? null),
        imageUrl: r.images?.[0]?.url ?? null,
        meta: artist ? { artist } : undefined,
      }
    })
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 8)
}

// ─── iTunes helpers ──────────────────────────────────────────────────────────

// iTunes artwork URLs end in e.g. "100x100bb.jpg" — swap to 600x600 for full res
function itunesArt(url: string | null): string | null {
  if (!url) return null
  return url.replace(/\d+x\d+bb\.jpg$/, '600x600bb.jpg')
}

// ─── iTunes (free fallback) ───────────────────────────────────────────────────

async function searchITunes(
  q: string,
  media: string,
  entity: string,
  map: (r: any) => SearchResult
): Promise<SearchResult[]> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=${media}&entity=${entity}&limit=15`
  )
  if (!res.ok) return []
  const data = await res.json()
  const seen = new Set<string>()
  return (data.results ?? [])
    .map(map)
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 8)
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
    .map((b: any) => {
      const author = b.author_name?.[0] ?? null
      return {
        title: b.title ?? null,
        subtitle: author,
        imageUrl: b.cover_i ? `https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg` : null,
        meta: author ? { author } : undefined,
      }
    })
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 8)
}

// ─── Restaurants ─────────────────────────────────────────────────────────────

async function searchRestaurantsGoogle(q: string, lat?: string, lng?: string): Promise<SearchResult[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return []
  // Bias results toward user's location (or London fallback) within 50km
  const locationBias = lat && lng
    ? `&location=${lat},${lng}&radius=50000`
    : `&location=51.5074,-0.1278&radius=50000`
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}&types=establishment${locationBias}&key=${key}`
  )
  if (!res.ok) return []
  const data = await res.json()
  const results = (data.predictions ?? [])
    .map((p: any) => {
      const name = p.structured_formatting?.main_text ?? p.description?.split(',')[0] ?? null
      const secondary = p.structured_formatting?.secondary_text ?? null
      const parts = secondary?.split(',').map((s: string) => s.trim()) ?? []
      const city = parts.length >= 2 ? parts[parts.length - 2] : parts[0] ?? null
      const address = parts[0] ?? null
      return {
        title: name,
        subtitle: secondary,
        imageUrl: null as string | null,
        meta: {
          address: address ?? undefined,
          city: city ?? undefined,
          place_id: p.place_id ?? undefined,
        },
      }
    })
    .filter((r: SearchResult) => r.title)
    .slice(0, 8)

  // Fetch thumbnails in parallel from Place Details
  await Promise.all(
    results.map(async (r) => {
      if (!r.meta?.place_id) return
      try {
        const detailRes = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${r.meta.place_id}&fields=photos,website&key=${key}`
        )
        const detail = await detailRes.json()
        if (detail.result?.website) r.meta!.website = detail.result.website
        const photoRef = detail.result?.photos?.[0]?.photo_reference
        if (photoRef) {
          const photoRes = await fetch(
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=100&photo_reference=${photoRef}&key=${key}`,
            { redirect: 'follow' }
          )
          r.imageUrl = photoRes.url
        }
      } catch {}
    })
  )

  return results
}

async function searchRestaurantsNominatim(q: string): Promise<SearchResult[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`,
    { headers: { 'User-Agent': 'RECO-App/1.0 (contact@givemeareco.com)' } }
  )
  if (!res.ok) return []
  const data = await res.json()
  const FOOD_TYPES = new Set(['restaurant', 'cafe', 'bar', 'pub', 'fast_food', 'food_court', 'bakery', 'ice_cream', 'biergarten'])
  const seen = new Set<string>()
  return (data as any[])
    .filter((r: any) => FOOD_TYPES.has(r.type) || r.class === 'amenity')
    .map((r: any) => {
      const name = r.address?.amenity ?? r.name ?? r.display_name?.split(',')[0]
      const road = r.address?.road ?? null
      const city = r.address?.city ?? r.address?.town ?? r.address?.village ?? null
      const country = r.address?.country_code?.toUpperCase() ?? null
      return {
        title: name,
        subtitle: [road, city].filter(Boolean).join(', '),
        imageUrl: null,
        meta: {
          address: road ?? undefined,
          city: [city, country].filter(Boolean).join(', ') || undefined,
        },
      }
    })
    .filter((r: SearchResult) => r.title && !seen.has(r.title) && seen.add(r.title!))
    .slice(0, 8)
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  const category = req.nextUrl.searchParams.get('category')
  const lat = req.nextUrl.searchParams.get('lat') ?? undefined
  const lng = req.nextUrl.searchParams.get('lng') ?? undefined

  if (!q || q.length < 2) return NextResponse.json([])

  try {
    switch (category) {
      case 'restaurant': {
        const google = await searchRestaurantsGoogle(q, lat, lng)
        if (google.length) return NextResponse.json(google)
        return NextResponse.json(await searchRestaurantsNominatim(q))
      }

      case 'film': {
        const tmdb = await searchTMDB(q, 'movie')
        if (tmdb.length) return NextResponse.json(tmdb)
        return NextResponse.json(
          await searchITunes(q, 'movie', 'movie', r => ({
            title: r.trackName ?? null,
            subtitle: r.releaseDate?.slice(0, 4) ?? null,
            imageUrl: itunesArt(r.artworkUrl100 ?? null),
            meta: { year: r.releaseDate?.slice(0, 4) },
          }))
        )
      }

      case 'tv': {
        const tmdb = await searchTMDB(q, 'tv')
        if (tmdb.length) return NextResponse.json(tmdb)
        return NextResponse.json(
          await searchITunes(q, 'tvShow', 'tvSeason', r => ({
            title: r.artistName ?? null,
            subtitle: r.primaryGenreName ?? null,
            imageUrl: itunesArt(r.artworkUrl100 ?? null),
            meta: { genre: r.primaryGenreName },
          }))
        )
      }

      case 'music': {
        const spotify = await searchSpotify(q, 'album')
        if (spotify.length) return NextResponse.json(spotify)
        return NextResponse.json(
          await searchITunes(q, 'music', 'album', r => ({
            title: r.collectionName ?? r.trackName ?? null,
            subtitle: r.artistName ?? null,
            imageUrl: itunesArt(r.artworkUrl100 ?? null),
            meta: r.artistName ? { artist: r.artistName } : undefined,
          }))
        )
      }

      case 'podcast': {
        const spotify = await searchSpotify(q, 'show')
        const itunes = await searchITunes(q, 'podcast', 'podcast', r => ({
          title: r.collectionName ?? null,
          subtitle: r.artistName ?? null,
          imageUrl: itunesArt(r.artworkUrl600 ?? r.artworkUrl100 ?? null),
        }))
        const titles = new Set(spotify.map(r => r.title.toLowerCase()))
        return NextResponse.json([...spotify, ...itunes.filter(r => !titles.has(r.title.toLowerCase()))].slice(0, 6))
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
