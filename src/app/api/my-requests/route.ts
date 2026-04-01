import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch requests
  const { data: requests, error } = await supabase
    .from('reco_requests')
    .select('id, category, context, created_at')
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json([], { status: 500 })

  // Fetch notifications that were sent for these requests (who was asked)
  const { data: notifs } = await supabase
    .from('notifications')
    .select('user_id, payload, created_at, profiles:user_id (display_name)')
    .eq('actor_id', user.id)
    .eq('type', 'request_received')
    .order('created_at', { ascending: false })

  // Fetch recos that were sent back to this user around the same time as requests
  // (responses = recos received after each request)
  const { data: receivedRecos } = await supabase
    .from('reco_recipients')
    .select('reco_id, created_at, recommendations!inner(category, title, sender_id, profiles:sender_id (display_name))')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })

  // Enrich each request with recipients and response count
  const enriched = (requests ?? []).map((req) => {
    const payload = typeof req.context === 'string' ? JSON.parse(req.context) : req.context
    const cat = req.category

    // Find notifications sent around the same time with matching category
    const requestTime = new Date(req.created_at).getTime()
    const matchingNotifs = (notifs ?? []).filter((n: any) => {
      const nTime = new Date(n.created_at).getTime()
      const nCat = n.payload?.category
      return Math.abs(nTime - requestTime) < 60000 && nCat === cat // within 1 minute
    })

    const askedPeople = matchingNotifs.map((n: any) => ({
      name: n.profiles?.display_name ?? 'Unknown',
    }))

    // Count responses: recos received in this category after the request
    const responses = (receivedRecos ?? []).filter((rr: any) => {
      const rrTime = new Date(rr.created_at).getTime()
      const rrCat = rr.recommendations?.category
      return rrTime > requestTime && rrCat === cat
    })

    const respondedPeople = responses.map((rr: any) => ({
      name: rr.recommendations?.profiles?.display_name ?? 'Unknown',
      title: rr.recommendations?.title,
    }))

    return {
      ...req,
      asked: askedPeople,
      responses: respondedPeople,
      responseCount: respondedPeople.length,
    }
  })

  return NextResponse.json(enriched)
}
