import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Verify authenticated
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, canonicalName, absorbedName, canonicalUserId } = body

  // Use service role to bypass RLS on recommendations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Find all reco IDs where this user is recipient and the absorbed name matches
  const { data: recoRows } = await supabase
    .from('reco_recipients')
    .select('reco_id')
    .eq('recipient_id', user.id)

  const recoIds = (recoRows ?? []).map((r: any) => r.reco_id)
  if (recoIds.length === 0) return NextResponse.json({ mergeId: null, error: 'No recos found' })

  // Get recommendations with matching manual_sender_name
  const { data: recos } = await supabase
    .from('recommendations')
    .select('id, meta')
    .in('id', recoIds)

  const matchingRecos = (recos ?? []).filter((r: any) => {
    const name = r.meta?.manual_sender_name
    return typeof name === 'string' && name.trim().toLowerCase() === absorbedName.trim().toLowerCase()
  })

  if (matchingRecos.length === 0) return NextResponse.json({ mergeId: null, error: 'No matching recos' })

  const matchingIds = matchingRecos.map((r: any) => r.id)

  // Update recommendations
  for (const reco of matchingRecos) {
    let newMeta: Record<string, unknown>
    if (type === 'quick_add_to_user') {
      newMeta = {
        ...reco.meta,
        manual_sender_name: null,
        resolved_sender_id: canonicalUserId,
        resolved_sender_name: canonicalName,
      }
    } else {
      // quick_add_to_quick_add
      newMeta = { ...reco.meta, manual_sender_name: canonicalName.trim() }
    }
    await supabase.from('recommendations').update({ meta: newMeta }).eq('id', reco.id)
  }

  // Log the merge
  const { data: merge, error } = await supabase
    .from('sender_merges')
    .insert({
      performed_by: user.id,
      merge_type: type,
      canonical_name: canonicalName.trim(),
      canonical_id: canonicalUserId || null,
      absorbed_name: absorbedName.trim(),
      reco_ids_updated: matchingIds,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ mergeId: null, error: error.message })
  return NextResponse.json({ mergeId: merge.id })
}
