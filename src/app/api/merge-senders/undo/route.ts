import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { mergeId } = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: merge } = await supabase
    .from('sender_merges')
    .select('*')
    .eq('id', mergeId)
    .eq('performed_by', user.id)
    .single()

  if (!merge) return NextResponse.json({ error: 'Merge not found' })
  if (merge.undone_at) return NextResponse.json({ error: 'Already undone' })

  const recoIds = merge.reco_ids_updated ?? []

  for (const recoId of recoIds) {
    const { data: reco } = await supabase.from('recommendations').select('meta').eq('id', recoId).single()
    if (!reco) continue

    if (merge.merge_type === 'quick_add_to_quick_add') {
      const newMeta = { ...reco.meta, manual_sender_name: merge.absorbed_name }
      await supabase.from('recommendations').update({ meta: newMeta }).eq('id', recoId)
    } else if (merge.merge_type === 'quick_add_to_user') {
      const newMeta = { ...reco.meta, manual_sender_name: merge.absorbed_name, resolved_sender_id: null, resolved_sender_name: null }
      await supabase.from('recommendations').update({ meta: newMeta }).eq('id', recoId)
    }
  }

  await supabase.from('sender_merges').update({ undone_at: new Date().toISOString() }).eq('id', mergeId)
  return NextResponse.json({ error: null })
}
