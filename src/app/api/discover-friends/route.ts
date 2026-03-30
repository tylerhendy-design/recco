import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  const { emails, userId } = await req.json()
  if (!emails || !Array.isArray(emails) || !userId) {
    return NextResponse.json({ matches: [] })
  }

  // Normalise and dedupe emails, cap at 500
  const normalised = [...new Set(
    emails
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.includes('@'))
  )].slice(0, 500)

  if (normalised.length === 0) return NextResponse.json({ matches: [] })

  const supabase = adminClient()

  // Use admin listUsers to find matching emails
  // Supabase admin API pages through users — fetch in batches
  const matchedUserIds: string[] = []
  const emailSet = new Set(normalised)

  let page = 1
  const perPage = 1000
  while (true) {
    const { data: { users }, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error || !users || users.length === 0) break

    for (const u of users) {
      if (u.email && emailSet.has(u.email.toLowerCase()) && u.id !== userId) {
        matchedUserIds.push(u.id)
      }
    }

    if (users.length < perPage) break
    page++
  }

  if (matchedUserIds.length === 0) return NextResponse.json({ matches: [] })

  // Fetch profiles for matched users
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, username, avatar_url')
    .in('id', matchedUserIds)

  return NextResponse.json({ matches: profiles ?? [] })
}
