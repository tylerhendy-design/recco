import { createClient } from '@/lib/supabase/client'

export type MergeType = 'quick_add_to_user' | 'quick_add_to_quick_add' | 'user_to_user'

interface MergeResult {
  mergeId: string | null
  error: string | null
}

/**
 * Case B: Merge two Quick Add names into one canonical spelling.
 */
export async function mergeQuickAddNames(
  userId: string,
  canonicalName: string,
  absorbedName: string,
): Promise<MergeResult> {
  try {
    const res = await fetch('/api/merge-senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'quick_add_to_quick_add', canonicalName, absorbedName }),
    })
    const data = await res.json()
    return { mergeId: data.mergeId ?? null, error: data.error ?? null }
  } catch (e: any) {
    return { mergeId: null, error: e?.message ?? 'Merge failed' }
  }
}

/**
 * Case A: Merge a Quick Add name into a registered user.
 */
export async function mergeQuickAddToUser(
  userId: string,
  registeredUserId: string,
  registeredUserName: string,
  absorbedName: string,
): Promise<MergeResult> {
  try {
    const res = await fetch('/api/merge-senders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'quick_add_to_user', canonicalName: registeredUserName, absorbedName, canonicalUserId: registeredUserId }),
    })
    const data = await res.json()
    return { mergeId: data.mergeId ?? null, error: data.error ?? null }
  } catch (e: any) {
    return { mergeId: null, error: e?.message ?? 'Merge failed' }
  }
}

/**
 * Undo a merge by restoring original data.
 */
export async function undoMerge(mergeId: string): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { data: merge } = await supabase
    .from('sender_merges')
    .select('*')
    .eq('id', mergeId)
    .single()

  if (!merge) return { error: 'Merge not found' }
  if (merge.undone_at) return { error: 'Already undone' }

  // Use API for the undo too (needs service role for recommendations update)
  try {
    const res = await fetch('/api/merge-senders/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mergeId }),
    })
    const data = await res.json()
    return { error: data.error ?? null }
  } catch (e: any) {
    return { error: e?.message ?? 'Undo failed' }
  }
}
