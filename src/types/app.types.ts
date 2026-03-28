import type { CategoryId, CategoryDef } from '@/constants/categories'
import type { TierId } from '@/constants/tiers'

export type { CategoryId, TierId }

// ─── User / Profile ──────────────────────────────────────────────────────────

export interface Profile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  joined_at: string
  recos_sent: number
}

// ─── Friends ─────────────────────────────────────────────────────────────────

export interface Friend {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  tier: TierId
  taste_alignment: number  // 0-100
  taste_by_category: TasteAlignment[]
  is_sinbinned: boolean
  sinbin_category?: string
  sinbin_count?: number
}

export interface TasteAlignment {
  category: CategoryId
  score: number  // 0-100 alignment
  heart_count: number  // 1-3 hearts shown in UI
  is_mismatch: boolean
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export interface RecoMeta {
  // Restaurant
  location?: string
  address?: string
  instagram?: string
  website?: string
  image_url?: string
  occasion?: string
  price?: string
  // TV
  streaming_service?: string
  year?: number
  genre?: string
  mood?: string
  // Podcast / Music
  spotify_url?: string
  artwork_url?: string
  spotify_title?: string
  artist?: string
  era?: string
  // Book
  author?: string
  goodreads_url?: string
  length?: string
  // Film
  director?: string
  // Podcast
  topic?: string
  // Custom / default
  vibes?: string
  budget?: string
  // Generic links
  links?: string[]
}

export interface Reco {
  id: string
  sender_id: string
  sender: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
  category: CategoryId
  custom_cat?: string
  title: string
  why_text?: string
  why_audio_url?: string
  meta: RecoMeta
  created_at: string
  // Recipient-specific fields (when fetched as a recipient)
  status?: 'unseen' | 'done' | 'been_there' | 'no_go'
  score?: number
  feedback_text?: string
  rated_at?: string
  // Aggregated
  recommenders?: RecoRecommender[]  // all people who sent this same reco to you
  rank?: number
}

export interface RecoRecommender {
  profile: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>
  why_text?: string
  tier: TierId
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotifType =
  | 'feedback_received'
  | 'reco_received'
  | 'request_received'
  | 'friend_added'
  | 'sin_bin'

export interface Notification {
  id: string
  user_id: string
  type: NotifType
  actor: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
  reco?: Pick<Reco, 'id' | 'title' | 'category'>
  score?: number
  feedback_text?: string
  read: boolean
  created_at: string
}

// ─── Messages ────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  reco_id: string
  sender_id: string
  recipient_id: string
  body?: string
  audio_url?: string
  created_at: string
}

// ─── Lists ───────────────────────────────────────────────────────────────────

export interface RecoList {
  id: string
  owner_id: string
  owner: Pick<Profile, 'id' | 'display_name'>
  title: string
  description?: string
  status: 'draft' | 'published'
  items: ListItem[]
  shared_with: Pick<Profile, 'id' | 'display_name'>[]
  created_at: string
}

export interface ListItem {
  id: string
  list_id: string
  category: CategoryId | string
  title: string
  note?: string
  sort_order: number
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export interface FilterOption {
  value: string
  label: string
}

export interface SentimentInfo {
  label: 'bad' | 'meh' | 'good'
  text: string
  color: string
  bgColor: string
}
