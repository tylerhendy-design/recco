import { createClient } from '@/lib/supabase/client'

export type MergeType = 'quick_add_to_user' | 'quick_add_to_quick_add' | 'user_to_user'

interface MergeResult {
  mergeId: string | null
  error: string | null
}

/**
 * Case B: Merge two Quick Add names into one canonical spelling.
 * Updates all recommendations with the absorbed name to use the canonical name.
 */
export async function mergeQuickAddNames(
  userId: string,
  canonicalName: string,
  absorbedName: string,
): Promise<MergeResult> {
  const supabase = createClient()

  // Find all reco IDs where this user is recipient and the absorbed name is the sender
  const { data: recoRows } = await supabase
    .from('reco_recipients')
    .select('reco_id, recommendations!inner(id, meta)')
    .eq('recipient_id', userId)

  const matchingIds = (recoRows ?? [])
    .filter((r: any) => {
      const name = r.recommendations?.meta?.manual_sender_name
      return typeof name === 'string' && name.trim().toLowerCase() === absorbedName.trim().toLowerCase()
    })
    .map((r: any) => r.reco_id)

  if (matchingIds.length === 0) return { mergeId: null, error: 'No matching recos found' }

  // Update each recommendation's manual_sender_name
  for (const recoId of matchingIds) {
    const { data: reco } = await supabase.from('recommendations').select('meta').eq('id', recoId).single()
    if (reco) {
      const newMeta = { ...reco.meta, manual_sender_name: canonicalName.trim() }
      await supabase.from('recommendations').update({ meta: newMeta }).eq('id', recoId)
    }
  }

  // Log the merge
  const { data: merge, error } = await supabase
    .from('sender_merges')
    .insert({
      performed_by: userId,
      merge_type: 'quick_add_to_quick_add',
      canonical_name: canonicalName.trim(),
      absorbed_name: absorbedName.trim(),
      reco_ids_updated: matchingIds,
    })
    .select('id')
    .single()

  if (error) return { mergeId: null, error: error.message }
  return { mergeId: merge.id, error: null }
}

/**
 * Case A: Merge a Quick Add name into a registered user.
 * Stores resolved_sender_id in the reco meta so the filter can join on it.
 */
export async function mergeQuickAddToUser(
  userId: string,
  registeredUserId: string,
  registeredUserName: string,
  absorbedName: string,
): Promise<MergeResult> {
  const supabase = createClient()

  const { data: recoRows } = await supabase
    .from('reco_recipients')
    .select('reco_id, recommendations!inner(id, meta)')
    .eq('recipient_id', userId)

  const matchingIds = (recoRows ?? [])
    .filter((r: any) => {
      const name = r.recommendations?.meta?.manual_sender_name
      return typeof name === 'string' && name.trim().toLowerCase() === absorbedName.trim().toLowerCase()
    })
    .map((r: any) => r.reco_id)

  if (matchingIds.length === 0) return { mergeId: null, error: 'No matching recos found' }

  // Update each recommendation: clear manual_sender_name, set resolved_sender_id
  for (const recoId of matchingIds) {
    const { data: reco } = await supabase.from('recommendations').select('meta').eq('id', recoId).single()
    if (reco) {
      const newMeta = {
        ...reco.meta,
        manual_sender_name: null,
        resolved_sender_id: registeredUserId,
        resolved_sender_name: registeredUserName,
      }
      await supabase.from('recommendations').update({ meta: newMeta }).eq('id', recoId)
    }
  }

  const { data: merge, error } = await supabase
    .from('sender_merges')
    .insert({
      performed_by: userId,
      merge_type: 'quick_add_to_user',
      canonical_name: registeredUserName,
      canonical_id: registeredUserId,
      absorbed_name: absorbedName,
      reco_ids_updated: matchingIds,
    })
    .select('id')
    .single()

  if (error) return { mergeId: null, error: error.message }
  return { mergeId: merge.id, error: null }
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

  const recoIds = merge.reco_ids_updated ?? []

  if (merge.merge_type === 'quick_add_to_quick_add') {
    // Restore the absorbed name
    for (const recoId of recoIds) {
      const { data: reco } = await supabase.from('recommendations').select('meta').eq('id', recoId).single()
      if (reco) {
        const newMeta = { ...reco.meta, manual_sender_name: merge.absorbed_name }
        await supabase.from('recommendations').update({ meta: newMeta }).eq('id', recoId)
      }
    }
  } else if (merge.merge_type === 'quick_add_to_user') {
    // Restore manual_sender_name, remove resolved_sender_id
    for (const recoId of recoIds) {
      const { data: reco } = await supabase.from('recommendations').select('meta').eq('id', recoId).single()
      if (reco) {
        const newMeta = { ...reco.meta, manual_sender_name: merge.absorbed_name, resolved_sender_id: null, resolved_sender_name: null }
        await supabase.from('recommendations').update({ meta: newMeta }).eq('id', recoId)
      }
    }
  }

  await supabase.from('sender_merges').update({ undone_at: new Date().toISOString() }).eq('id', mergeId)
  return { error: null }
}
