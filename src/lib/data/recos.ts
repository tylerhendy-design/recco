import { createClient } from '@/lib/supabase/client'
import type { Reco, RecoRecommender } from '@/types/app.types'
import { SCORE } from '@/constants/tiers'
import { fetchSinBinOffences } from '@/lib/data/sinbin'

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
    meta: (r.meta ?? {}) as Reco['meta'],
    created_at: r.created_at,
    status: (row.status as Reco['status']) ?? 'unseen',
    score: row.score ?? undefined,
    feedback_text: row.feedback_text ?? undefined,
    rated_at: row.rated_at ?? undefined,
    recommenders: [{
      profile: { id: sender.id, display_name: sender.display_name, username: sender.username, avatar_url: sender.avatar_url },
      why_text: r.why_text ?? undefined,
      tier: 'clan' as const,
    } satisfies RecoRecommender],
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
        why_text, why_audio_url, meta, created_at,
        profiles (id, display_name, username, avatar_url)
      )
    `)
    .eq('recipient_id', userId)
    .in('status', ['unseen', 'seen', 'been_there'])
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as RecipientRow[])
    .map(mapRecipientRow)
    .filter((r): r is Reco => r !== null)
}

// ── Fetch no-go recos for a user ─────────────────────────────────────────────
export async function fetchNoGoRecos(userId: string): Promise<Reco[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reco_recipients')
    .select(`
      id, status, score, feedback_text, rated_at,
      recommendations (
        id, sender_id, category, custom_cat, title,
        why_text, why_audio_url, meta, created_at,
        profiles (id, display_name, username, avatar_url)
      )
    `)
    .eq('recipient_id', userId)
    .eq('status', 'no_go')
    .order('rated_at', { ascending: false })

  if (error || !data) return []
  return (data as RecipientRow[]).map(mapRecipientRow).filter((r): r is Reco => r !== null)
}

// ── Fetch completed recos for a user ─────────────────────────────────────────
export async function fetchDoneRecos(userId: string): Promise<Reco[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('reco_recipients')
    .select(`
      id, status, score, feedback_text, rated_at,
      recommendations (
        id, sender_id, category, custom_cat, title,
        why_text, why_audio_url, meta, created_at,
        profiles (id, display_name, username, avatar_url)
      )
    `)
    .eq('recipient_id', userId)
    .eq('status', 'done')
    .order('rated_at', { ascending: false })

  if (error || !data) return []
  return (data as RecipientRow[]).map(mapRecipientRow).filter((r): r is Reco => r !== null)
}

// ── Mark a reco as done + save feedback ──────────────────────────────────────
export async function submitFeedback({
  recoId,
  recipientId,
  senderId,
  score,
  feedbackText,
  recoTitle,
  recoCategory,
}: {
  recoId: string
  recipientId: string
  senderId: string
  score: number
  feedbackText: string
  recoTitle?: string
  recoCategory?: string
}): Promise<{ error: string | null; sinBinTriggered?: { category: string; offences: string[] }; sinBinWarning?: { category: string; remaining: number } }> {
  const supabase = createClient()

  // 1. Update recipient row (DB trigger update_sin_bin fires here)
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

  // 2. Create a feedback notification for the sender
  await supabase
    .from('notifications')
    .insert({
      user_id: senderId,
      type: 'feedback_received',
      actor_id: recipientId,
      reco_id: recoId,
      payload: { score, feedback_text: feedbackText, reco_title: recoTitle, reco_category: recoCategory },
    })

  // 3. Check if this bad score just triggered a sin bin — count via reco_recipients join only
  if (score <= SCORE.BAD_MAX && recoCategory) {
    // Join through recommendations — only reads reco_recipients rows Vanessa (recipientId) owns
    const { data: badRows } = await supabase
      .from('reco_recipients')
      .select('reco_id, recommendations!inner(sender_id, category)')
      .eq('recipient_id', recipientId)
      .lte('score', SCORE.BAD_MAX)
      .not('score', 'is', null)

    const badCount = (badRows ?? []).filter(
      (r: any) => r.recommendations?.sender_id === senderId && r.recommendations?.category === recoCategory
    ).length

    if (badCount >= SCORE.SIN_BIN_THRESHOLD) {
        // Ensure sin_bin row exists and is active (belt and suspenders with DB trigger)
        const { data: existing } = await supabase
          .from('sin_bin')
          .select('id, is_active')
          .eq('sender_id', senderId)
          .eq('recipient_id', recipientId)
          .eq('category', recoCategory)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('sin_bin')
            .update({ bad_count: badCount, is_active: true })
            .eq('id', existing.id)
        } else {
          await supabase.from('sin_bin').insert({
            sender_id: senderId,
            recipient_id: recipientId,
            category: recoCategory,
            bad_count: badCount,
            is_active: true,
            triggered_at: new Date().toISOString(),
            released_at: null,
          })
        }

        // Fire notification + modal only on the exact threshold hit
        if (badCount === SCORE.SIN_BIN_THRESHOLD) {
          const offences = await fetchSinBinOffences(senderId, recipientId, recoCategory)

          await supabase.from('notifications').insert({
            user_id: senderId,
            type: 'sin_bin',
            actor_id: recipientId,
            payload: { category: recoCategory, bad_count: SCORE.SIN_BIN_THRESHOLD, offences, last_reco_title: recoTitle },
          })

          return { error: null, sinBinTriggered: { category: recoCategory, offences } }
        }
    } else if (badCount > 0 && badCount < SCORE.SIN_BIN_THRESHOLD) {
      // Below threshold — return a warning with how many remain
      return { error: null, sinBinWarning: { category: recoCategory, remaining: SCORE.SIN_BIN_THRESHOLD - badCount } }
    }
  }

  return { error: null }
}

// ── Mark a reco as "been there, done that" ───────────────────────────────────
export async function markBeenThere(recoId: string, recipientId: string, senderId: string, recoTitle: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await (supabase.from('reco_recipients') as any)
    .update({ status: 'been_there' })
    .eq('reco_id', recoId)
    .eq('recipient_id', recipientId)
  if (error) return { error: error.message }
  await (supabase.from('notifications') as any).insert({
    user_id: senderId,
    type: 'feedback_received',
    actor_id: recipientId,
    reco_id: recoId,
    payload: { subtype: 'been_there', reco_title: recoTitle },
  })
  return { error: null }
}

// ── Mark a reco as "no go" and notify the sender ─────────────────────────────
export async function markNoGo(recoId: string, recipientId: string, senderId: string, reason: string, recoTitle: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await (supabase.from('reco_recipients') as any)
    .update({ status: 'no_go', feedback_text: reason, rated_at: new Date().toISOString() })
    .eq('reco_id', recoId)
    .eq('recipient_id', recipientId)
  if (error) return { error: error.message }
  await (supabase.from('notifications') as any).insert({
    user_id: senderId,
    type: 'feedback_received',
    actor_id: recipientId,
    reco_id: recoId,
    payload: { subtype: 'no_go', feedback_text: reason, reco_title: recoTitle },
  })
  return { error: null }
}

// ── Request a new reco from the sender ───────────────────────────────────────
export async function requestNewReco(recipientId: string, senderId: string, recoTitle: string, category: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  await (supabase.from('notifications') as any).insert({
    user_id: senderId,
    type: 'request_received',
    actor_id: recipientId,
    payload: { subtype: 'been_there_new_request', original_title: recoTitle, category, count: 1 },
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
    payload: { title },
  }))

  await supabase.from('notifications').insert(notifRows)

  return { recoId, error: null }
}
