export type CategoryId =
  | 'restaurant'
  | 'tv'
  | 'podcast'
  | 'music'
  | 'book'
  | 'film'
  | 'custom'

export interface CategoryDef {
  id: CategoryId
  label: string
  color: string
  bgColor: string
  extraFields: ExtraFieldDef[]
}

export interface ExtraFieldDef {
  id: string
  label: string
  placeholder: string
  type: 'text' | 'url' | 'spotify' | 'location' | 'image' | 'date'
  sublabel?: string
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'restaurant',
    label: 'Restaurants',
    color: '#F56E6E',
    bgColor: '#2a1010',
    extraFields: [
      { id: 'location', label: 'Location', placeholder: 'e.g. Soho, London or Paris...', type: 'location' },
      { id: 'instagram', label: 'Instagram', placeholder: 'Instagram handle...', type: 'text' },
      { id: 'website', label: 'Website', placeholder: 'Website URL...', type: 'url' },
      { id: 'image', label: 'Add image', placeholder: 'Tap to upload a photo', type: 'image' },
    ],
  },
  {
    id: 'tv',
    label: 'TV Shows',
    color: '#5BC4F5',
    bgColor: '#0e1e2e',
    extraFields: [
      { id: 'streaming', label: 'Streaming service', placeholder: 'e.g. Netflix, HBO, Prime...', type: 'text' },
      { id: 'date', label: 'Date', placeholder: '', type: 'date' },
    ],
  },
  {
    id: 'podcast',
    label: 'Podcasts',
    color: '#2DD4BF',
    bgColor: '#062420',
    extraFields: [
      {
        id: 'spotify_url',
        label: 'Spotify link',
        placeholder: 'Paste Spotify link — artwork auto-loads',
        type: 'spotify',
        sublabel: 'Artwork auto-fetched',
      },
    ],
  },
  {
    id: 'music',
    label: 'Music',
    color: '#C084FC',
    bgColor: '#1e1030',
    extraFields: [
      {
        id: 'spotify_url',
        label: 'Spotify link',
        placeholder: 'Paste Spotify link — artwork auto-loads',
        type: 'spotify',
        sublabel: 'Artwork auto-fetched',
      },
    ],
  },
  {
    id: 'book',
    label: 'Books',
    color: '#FB923C',
    bgColor: '#2a1808',
    extraFields: [
      { id: 'author', label: 'Author', placeholder: 'Author name...', type: 'text' },
      { id: 'link', label: 'Link', placeholder: 'Goodreads or Amazon URL...', type: 'url' },
    ],
  },
  {
    id: 'film',
    label: 'Films',
    color: '#F472B6',
    bgColor: '#2a0e1e',
    extraFields: [
      { id: 'director', label: 'Director', placeholder: 'Director name...', type: 'text' },
      { id: 'year', label: 'Year', placeholder: 'Year...', type: 'text' },
    ],
  },
  {
    id: 'custom',
    label: '+ Custom',
    color: '#D4E23A',
    bgColor: '#1e1e00',
    extraFields: [
      { id: 'custom_name', label: 'Category name', placeholder: 'e.g. Architects, Barbers, Gyms...', type: 'text' },
    ],
  },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c])
) as Record<CategoryId, CategoryDef>

export function getCategoryColor(id: string): string {
  return CATEGORY_MAP[id as CategoryId]?.color ?? '#888'
}

export function getCategoryBg(id: string): string {
  return CATEGORY_MAP[id as CategoryId]?.bgColor ?? '#1e1e1e'
}

export function getCategoryLabel(id: string): string {
  return CATEGORY_MAP[id as CategoryId]?.label ?? id
}
