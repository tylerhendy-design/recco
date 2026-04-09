import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  // Verify authenticated
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recoId, progressValue, progressLabel, recoTitle } = await req.json()
  if (!recoId || !progressValue || !progressLabel) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Use service role to bypass RLS (recipient can't update recommendations directly)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch current meta
  const { data: current, error: fetchErr } = await supabase
    .from('recommendations')
    .select('meta, sender_id')
    .eq('id', recoId)
    .single()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  // Verify this user is a recipient of this reco
  const { data: recipientRow } = await supabase
    .from('reco_recipients')
    .select('id')
    .eq('reco_id', recoId)
    .eq('recipient_id', user.id)
    .single()
  if (!recipientRow) return NextResponse.json({ error: 'Not a recipient' }, { status: 403 })

  // Update progress in meta
  const meta = (current?.meta as Record<string, unknown>) ?? {}
  const progress = (meta.progress as Record<string, unknown>) ?? {}
  progress[user.id] = { status: progressValue, label: progressLabel, updated_at: new Date().toISOString() }

  const { error: updateErr } = await supabase
    .from('recommendations')
    .update({ meta: { ...meta, progress } })
    .eq('id', recoId)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Notify the sender (unless self-reco)
  const senderId = current?.sender_id
  if (senderId && senderId !== user.id) {
    await supabase.from('notifications').insert({
      user_id: senderId,
      type: 'feedback_received',
      actor_id: user.id,
      reco_id: recoId,
      payload: { subtype: 'progress', progress_label: progressLabel, reco_title: recoTitle },
    })
  }

  return NextResponse.json({ ok: true })
}
