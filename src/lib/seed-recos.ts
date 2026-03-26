import type { Reco } from '@/types/app.types'

// Single source of truth for all seed recos.
// status: 'unseen' = incomplete (shown on home + browse)
// status: 'done'   = complete  (shown on browse only, with score + threadId)

export type SeedReco = Reco & { threadId?: string }

export const ALL_SEED_RECOS: SeedReco[] = [
  // ── Incomplete ───────────────────────────────────────────────────────────────
  {
    id: '1',
    sender_id: 'u4',
    sender: { id: 'u4', display_name: 'Samuel Powell', username: 'sampowell', avatar_url: null },
    category: 'restaurant',
    title: 'BAO Soho',
    why_text: 'Life-changing pork buns. Genuinely not joking.',
    meta: { location: 'Soho, London', instagram: 'baosoho' },
    created_at: '2025-03-10T10:00:00Z',
    status: 'unseen',
    recommenders: [
      { profile: { id: 'u4', display_name: 'Samuel Powell', avatar_url: null }, why_text: 'Life-changing pork buns. Genuinely not joking.', tier: 'close' },
      { profile: { id: 'u1', display_name: 'Sam Huckle', avatar_url: null }, why_text: 'Best lunch spot in Soho, full stop.', tier: 'close' },
    ],
  },
  {
    id: '2',
    sender_id: 'u1',
    sender: { id: 'u1', display_name: 'Sam Huckle', username: 'samhuckle', avatar_url: null },
    category: 'restaurant',
    title: 'Padella',
    why_text: 'Best pasta in London. Queue early.',
    meta: { location: 'Borough Market, London' },
    created_at: '2025-03-14T10:00:00Z',
    status: 'unseen',
    recommenders: [
      { profile: { id: 'u1', display_name: 'Sam Huckle', avatar_url: null }, why_text: 'Best pasta in London. Queue early.', tier: 'close' },
      { profile: { id: 'u3', display_name: 'Tyler', avatar_url: null }, why_text: 'Cacio e pepe is worth the wait.', tier: 'close' },
      { profile: { id: 'u2', display_name: 'Horlock', avatar_url: null }, why_text: 'Go on a weekday.', tier: 'clan' },
    ],
  },
  {
    id: '5',
    sender_id: 'u1',
    sender: { id: 'u1', display_name: 'Sam Huckle', username: 'samhuckle', avatar_url: null },
    category: 'tv',
    title: 'The Boys',
    why_text: 'Dark, weird, completely brilliant. You\'ll love it.',
    meta: { streaming_service: 'Amazon Prime' },
    created_at: '2025-03-12T10:00:00Z',
    status: 'unseen',
    recommenders: [
      { profile: { id: 'u1', display_name: 'Sam Huckle', avatar_url: null }, why_text: 'Dark, weird, completely brilliant. You\'ll love it.', tier: 'close' },
      { profile: { id: 'u2', display_name: 'Horlock', avatar_url: null }, why_text: 'Unlike anything else on TV right now.', tier: 'clan' },
      { profile: { id: 'u3', display_name: 'Tyler', avatar_url: null }, why_text: 'Watch it immediately.', tier: 'close' },
    ],
  },
  {
    id: '8',
    sender_id: 'u2',
    sender: { id: 'u2', display_name: 'Horlock', username: 'horlock', avatar_url: null },
    category: 'podcast',
    title: 'Acquired',
    why_text: 'You\'ll lose entire weekends. Don\'t say I didn\'t warn you.',
    meta: { spotify_url: 'https://open.spotify.com/show/acquired' },
    created_at: '2025-03-08T10:00:00Z',
    status: 'unseen',
    recommenders: [
      { profile: { id: 'u2', display_name: 'Horlock', avatar_url: null }, why_text: 'You\'ll lose entire weekends. Don\'t say I didn\'t warn you.', tier: 'clan' },
      { profile: { id: 'u5', display_name: 'Big Jimmy', avatar_url: null }, why_text: 'The Ben Thompson episode alone is worth it.', tier: 'close' },
    ],
  },

  // ── Complete (browse only) ───────────────────────────────────────────────────
  {
    id: '3',
    sender_id: 'u2',
    sender: { id: 'u2', display_name: 'Tyler Hendy', username: 'tylerhendy', avatar_url: null },
    category: 'restaurant',
    title: 'Bistroteque',
    why_text: 'Brilliant Sunday roast.',
    meta: { location: 'Bethnal Green, London' },
    created_at: '2025-02-20T10:00:00Z',
    status: 'done',
    score: 82,
    threadId: 'thread-bistroteque',
    recommenders: [
      { profile: { id: 'u2', display_name: 'Tyler Hendy', avatar_url: null }, why_text: 'Brilliant Sunday roast.', tier: 'close' },
    ],
  },
  {
    id: '4',
    sender_id: 'u6',
    sender: { id: 'u6', display_name: 'Mum', username: 'mum', avatar_url: null },
    category: 'restaurant',
    title: 'Dilpasand',
    why_text: 'Best curry in the city.',
    meta: { location: 'Tooting, London' },
    created_at: '2025-02-10T10:00:00Z',
    status: 'done',
    score: 91,
    threadId: 'thread-dilpasand',
    recommenders: [
      { profile: { id: 'u6', display_name: 'Mum', avatar_url: null }, why_text: 'Best curry in the city.', tier: 'tribe' },
    ],
  },
  {
    id: '6',
    sender_id: 'u5',
    sender: { id: 'u5', display_name: 'Big Jimmy', username: 'bigjimmy', avatar_url: null },
    category: 'tv',
    title: 'Succession',
    why_text: 'Nothing else comes close.',
    meta: { streaming_service: 'Now TV' },
    created_at: '2025-01-15T10:00:00Z',
    status: 'done',
    score: 95,
    threadId: 'thread-succession',
    recommenders: [
      { profile: { id: 'u5', display_name: 'Big Jimmy', avatar_url: null }, why_text: 'Nothing else comes close.', tier: 'close' },
    ],
  },
  {
    id: '7',
    sender_id: 'u1',
    sender: { id: 'u1', display_name: 'Sam Huckle', username: 'samhuckle', avatar_url: null },
    category: 'tv',
    title: 'The Bear',
    why_text: 'Stressful in the best way.',
    meta: { streaming_service: 'Disney+' },
    created_at: '2025-01-20T10:00:00Z',
    status: 'done',
    score: 22,
    threadId: 'thread-the-bear',
    recommenders: [
      { profile: { id: 'u1', display_name: 'Sam Huckle', avatar_url: null }, why_text: 'Stressful in the best way.', tier: 'close' },
    ],
  },
  {
    id: '9',
    sender_id: 'u3',
    sender: { id: 'u3', display_name: 'Tyler', username: 'tylerhendy', avatar_url: null },
    category: 'podcast',
    title: 'Conan Needs a Friend',
    why_text: 'Genuinely the funniest podcast around.',
    meta: { spotify_url: 'https://open.spotify.com/show/conan' },
    created_at: '2025-02-01T10:00:00Z',
    status: 'done',
    score: 88,
    threadId: 'thread-conan',
    recommenders: [
      { profile: { id: 'u3', display_name: 'Tyler', avatar_url: null }, why_text: 'Genuinely the funniest podcast around.', tier: 'close' },
    ],
  },
]

export const INCOMPLETE_RECOS = ALL_SEED_RECOS.filter((r) => r.status !== 'done')

// Group all recos by category for the browse page
export const BROWSE_SECTIONS = [
  { section: 'Restaurants', category: 'restaurant' },
  { section: 'TV Series',   category: 'tv' },
  { section: 'Podcasts',    category: 'podcast' },
].map(({ section, category }) => ({
  section,
  category,
  items: ALL_SEED_RECOS.filter((r) => r.category === category),
})).filter((s) => s.items.length > 0)
