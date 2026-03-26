import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Handles the OAuth redirect from Google/Apple.
// Supabase exchanges the code for a session, then we decide where to send the user.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if profile is complete (has a real username, not the temp one)
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name')
          .eq('id', user.id)
          .single()

        // If no profile or username looks like the auto-generated temp value,
        // send them to the setup screen first
        const tempUsername = user.email ? user.email.split('@')[0] : user.id
        const needsSetup = !profile || profile.username === tempUsername

        if (needsSetup) {
          return NextResponse.redirect(`${origin}/setup-profile`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Something went wrong — send back to login with an error param
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
