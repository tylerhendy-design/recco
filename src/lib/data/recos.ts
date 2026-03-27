import { createClient } from '@/lib/supabase/client'
import type { Reco } from '@/types/app.types'

// ── Types returned from Supabase queries ──────────────────────────────────────

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
    photo_urls: string[]
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

// Map a Supabase row into the app's Reco type
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
    photo_urls: r.photo_urls ?? [],
    meta: (r.meta ?? {}) as Reco['meta'],
    created_at: r.created_at,
    status: (row.status as Reco['status']) ?? 'unseen',
    score: row.score ?? undefined,
    feedback_text: row.feedback_text ?? undefined,
    rated_at: row.rated_at ?? undefined,
  }
}

// ── Fetch the current user's incomplete recos (home feed) ─────────────────────
export async function fetchHomeFeed(userId: string): Promise<Reco[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('reco_recipients')
    .select(`
      id, status, score, feedback_text, rated_at,
      recommendations (
        id, sender_id, category, custom_cat, title,
        why_text, why_audio_url, photo_urls, meta, created_at,
        profiles (id, display_name, username, avatar_url)
      )
    `)
    .eq('recipient_id', userId)
    .in('status', ['unseen', 'seen'])
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as RecipientRow[])
    .map(mapRecipientRow)
    .filter((r): r is Reco => r !== null)
}

// ── Mark a reco as done + save feedback ──────────────────────────────────────
export async function submitFeedback({
  recoId,
  recipientId,
  senderId,
  score,
  feedbackText,
}: {
  recoId: string
  recipientId: string
  senderId: string
  score: number
  feedbackText: string
}): Promise<{ error: string | null }> {
  const supabase = createClient()

  // 1. Update recipient row
  const { error: updateError } = await supabase
    .from('reco_recipients')
    .update({
      status: 'done',
      score,
      feedback_text: feedbackText || null,
      rated_at: new Date().toISOString(),
    })
    .eq('reco_id', recoId)
    .eq('recipient_id', recipientId)

  if (updateError) return { error: updateError.message }

  // 2. Create a notification for the sender
  await supabase
    .from('notifications')
    .insert({
      user_id: senderId,
      type: 'feedback_received',
      actor_id: recipientId,
      reco_id: recoId,
      payload: { score, feedback_text: feedbackText },
    })

  return { error: null }
}

// ── Send a reco to one or more people ────────────────────────────────────────
export async function sendReco({
  senderId,
  category,
  customCat,
  title,
  whyText,
  links,
  meta,
  recipientIds,
}: {
  senderId: string
  category: string
  customCat?: string
  title: string
  whyText?: string
  links?: string[]
  meta?: Record<string, unknown>
  recipientIds: string[]
}): Promise<{ recoId: string | null; error: string | null }> {
  const supabase = createClient()

  const recoId = crypto.randomUUID()

  const filteredLinks = (links ?? []).filter((l) => l.trim())
  const metaWithLinks = filteredLinks.length > 0
    ? { ...(meta ?? {}), links: filteredLinks }
    : (meta ?? {})

  // 1. Create the recommendation (id generated client-side to avoid SELECT after INSERT)
  const { error: recoError } = await supabase
    .from('recommendations')
    .insert({
      id: recoId,
      sender_id: senderId,
      category,
      custom_cat: customCat ?? null,
      title,
      why_text: whyText ?? null,
      meta: metaWithLinks,
    })

  if (recoError) return { recoId: null, error: recoError.message }

  // 2. Add recipients
  const recipientRows = recipientIds.map((id) => ({
    reco_id: recoId,
    recipient_id: id,
    status: 'unseen' as const,
  }))

  const { error: recipientsError } = await supabase
    .from('reco_recipients')
    .insert(recipientRows)

  if (recipientsError) return { recoId, error: recipientsError.message }

  // 3. Notify each recipient
  const notifRows = recipientIds.map((id) => ({
    user_id: id,
    type: 'reco_received' as const,
    actor_id: senderId,
    reco_id: recoId,
    payload: {},
  }))

  await supabase.from('notifications').insert(notifRows)

  return { recoId, error: null }
}
