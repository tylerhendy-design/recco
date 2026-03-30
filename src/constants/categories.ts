export type CategoryId =
  | 'restaurant'
  | 'bars'
  | 'book'
  | 'clubs'
  | 'cocktails'
  | 'culture'
  | 'film'
  | 'music'
  | 'podcast'
  | 'pubs'
  | 'tv'
  | 'wine_bars'
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
  // Restaurants always first
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
  // Then alphabetical
  {
    id: 'bars',
    label: 'Bars',
    color: '#FBBF24',
    bgColor: '#2a2008',
    extraFields: [
      { id: 'location', label: 'Location', placeholder: 'e.g. Shoreditch, London...', type: 'location' },
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
    id: 'clubs',
    label: 'Clubs',
    color: '#E879F9',
    bgColor: '#2a0e2a',
    extraFields: [
      { id: 'location', label: 'Location', placeholder: 'e.g. Dalston, London...', type: 'location' },
      { id: 'music_type', label: 'Music', placeholder: 'e.g. house, techno, R&B...', type: 'text' },
    ],
  },
  {
    id: 'cocktails',
    label: 'Cocktails',
    color: '#F472B6',
    bgColor: '#2a0e1e',
    extraFields: [
      { id: 'location', label: 'Location', placeholder: 'e.g. Covent Garden...', type: 'location' },
    ],
  },
  {
    id: 'culture',
    label: 'Culture',
    color: '#818CF8',
    bgColor: '#141430',
    extraFields: [
      { id: 'type', label: 'Type', placeholder: 'e.g. gallery, museum, theatre...', type: 'text' },
      { id: 'location', label: 'Location', placeholder: 'e.g. South Bank, London...', type: 'location' },
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
    id: 'pubs',
    label: 'Pubs',
    color: '#A3E635',
    bgColor: '#1a2008',
    extraFields: [
      { id: 'location', label: 'Location', placeholder: 'e.g. Hampstead, London...', type: 'location' },
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
    id: 'wine_bars',
    label: 'Wine Bars',
    color: '#DC2626',
    bgColor: '#2a0808',
    extraFields: [
      { id: 'location', label: 'Location', placeholder: 'e.g. Marylebone, London...', type: 'location' },
    ],
  },
  // Custom always last
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
