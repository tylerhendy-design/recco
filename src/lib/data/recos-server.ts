import { createClient } from '@/lib/supabase/server'
import type { Reco, RecoRecommender } from '@/types/app.types'

type RecipientRow = {
  id: string
  status: string
  score: number | null
  feedback_text: string | null
  rated_at: string | null
  recommendations: {
    id: string
    sender_id: string
    category: string
    custom_cat: string | null
    title: string
    why_text: string | null
    why_audio_url: string | null
    meta: Record<string, unknown>
    created_at: string
    profiles: {
      id: string
      display_name: string
      username: string
      avatar_url: string | null
    } | null
  } | null
}

function mapRecipientRow(row: RecipientRow): Reco | null {
  const r = row.recommendations
  if (!r) return null
  const sender = r.profiles
  if (!sender) return null

  return {
    id: r.id,
    sender_id: r.sender_id,
    sender: {
      id: sender.id,
      display_name: sender.display_name,
      username: sender.username,
      avatar_url: sender.avatar_url,
    },
    category: r.category as Reco['category'],
    custom_cat: r.custom_cat ?? undefined,
    title: r.title,
    why_text: r.why_text ?? undefined,
    why_audio_url: r.why_audio_url ?? undefined,
    meta: (r.meta ?? {}) as Reco['meta'],
    created_at: r.created_at,
    status: (row.status as Reco['status']) ?? 'unseen',
    score: row.score ?? undefined,
    feedback_text: row.feedback_text ?? undefined,
    rated_at: row.rated_at ?? undefined,
    recommenders: (r.meta as any)?.manual_sender_name ? undefined : [{
      profile: { id: sender.id, display_name: sender.display_name, username: sender.username, avatar_url: sender.avatar_url },
      why_text: r.why_text ?? undefined,
      tier: 'clan' as const,
    } satisfies RecoRecommender],
  }
}

/**
 * Server-side feed fetch — runs during SSR with the user's session from cookies.
 * Returns null if not authenticated (client will handle redirect).
 */
export async function fetchHomeFeedServer(): Promise<{ userId: string; recos: Reco[]; profile: { display_name: string; avatar_url: string | null } | null } | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Parallel fetch: feed + profile (same as client but server-side)
    const [{ data: feedData }, { data: profileData }] = await Promise.all([
      supabase
        .from('reco_recipients')
        .select(`
          id, status, score, feedback_text, rated_at,
          recommendations (
            id, sender_id, category, custom_cat, title,
            why_text, why_audio_url, meta, created_at,
            profiles (id, display_name, username, avatar_url)
          )
        `)
        .eq('recipient_id', user.id)
        .in('status', ['unseen', 'seen', 'been_there'])
        .order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single(),
    ])

    const recos = (feedData as RecipientRow[] ?? [])
      .map(mapRecipientRow)
      .filter((r): r is Reco => r !== null)

    return {
      userId: user.id,
      recos,
      profile: profileData,
    }
  } catch {
    // Any failure: return null, client will fetch on mount
    return null
  }
}
