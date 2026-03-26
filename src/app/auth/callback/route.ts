import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  // Collect cookies during the exchange so we can attach them to the redirect.
  // Using NextResponse.redirect() creates a new response object — cookies set
  // on the server cookieStore don't automatically transfer to it, so we
  // accumulate them here and apply them manually at the end.
  const cookiesToSet: { name: string; value: string; options?: object }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookies) {
          cookiesToSet.push(...cookies)
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Decide where to send the user
  const { data: { user } } = await supabase.auth.getUser()
  let redirectTo = `${origin}${next}`

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()

    const tempUsername = user.email ? user.email.split('@')[0] : user.id
    const needsSetup = !profile || profile.username === tempUsername

    if (needsSetup) {
      redirectTo = `${origin}/setup-profile`
    }
  }

  // Build the redirect and attach all session cookies to it
  const response = NextResponse.redirect(redirectTo)
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  })

  return response
}
