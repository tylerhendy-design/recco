'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [loading, setLoading] = useState<'google' | 'apple' | 'email' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEmail, setShowEmail] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('method')
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'auth_failed') setError('Sign in failed. Please try again.')
    else if (err === 'no_code') setError('No auth code received. Please try again.')
    else if (err) setError(`Error: ${err}`)
  }, [searchParams])

  async function signInWithEmail() {
    if (!email.trim() || !password.trim()) return
    setLoading('email')
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      // If sign in fails, try sign up
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin}/auth/callback` },
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(null)
        return
      }
    }
    // Redirect on success
    window.location.href = '/home'
  }

  async function signIn(provider: 'google' | 'apple') {
    setLoading(provider)
    setError(null)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${siteUrl}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-svh bg-[#d8d8d8] flex items-center justify-center">
      <div className="relative flex flex-col w-full md:w-[390px] min-h-svh md:h-[844px] md:min-h-0 bg-bg-base md:rounded-[48px] md:border md:border-[#2a2a2e] md:shadow-phone md:overflow-hidden font-sans">

        {/* Wordmark */}
        <div className="flex-1 flex flex-col items-center justify-center px-9">
          <Image
            src="/wordmark.svg"
            alt="reco."
            width={110}
            height={55}
            className="mb-10"
          />

          <div className="text-[16px] text-text-muted text-center mb-10 leading-[1.6]">
            Human recommendations from people you trust. No algorithms.
          </div>

          {/* Sign in buttons */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => signIn('google')}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 bg-[#1e1e22] text-white border border-border py-4 rounded-btn text-[15px] font-semibold disabled:opacity-50 transition-opacity active:opacity-70"
            >
              {loading === 'google' ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            <div>
              <p className="text-center text-[12px] text-text-faint mb-2">Coming soon</p>
              <button
                disabled
                className="w-full flex items-center justify-center gap-3 bg-white text-[#0c0c0e] py-4 rounded-btn text-[15px] font-semibold opacity-20 cursor-not-allowed"
              >
                <AppleIcon />
                Continue with Apple
              </button>
            </div>
          </div>

          {/* Email/password — for testing and QA */}
          <div className="w-full mt-4">
            {!showEmail ? (
              <button
                onClick={() => setShowEmail(true)}
                className="w-full text-center text-[12px] text-text-faint hover:text-text-muted transition-colors py-2"
                data-testid="show-email-login"
              >
                Sign in with email instead
              </button>
            ) : (
              <form className="flex flex-col gap-2.5" onSubmit={(e) => { e.preventDefault(); signInWithEmail() }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1e1e22] border border-border rounded-btn px-4 py-3.5 text-[14px] text-white outline-none placeholder:text-[#555] focus:border-accent font-sans"
                  data-testid="email-input"
                  name="email"
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1e1e22] border border-border rounded-btn px-4 py-3.5 text-[14px] text-white outline-none placeholder:text-[#555] focus:border-accent font-sans"
                  data-testid="password-input"
                  name="password"
                  autoComplete="current-password"
                />
                <button
                  type="submit"
                  disabled={loading === 'email' || !email.trim() || !password.trim()}
                  className="w-full bg-accent text-accent-fg py-3.5 rounded-btn text-[15px] font-semibold disabled:opacity-40 transition-opacity"
                  data-testid="email-submit"
                >
                  {loading === 'email' ? (
                    <span className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin inline-block" />
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            )}
          </div>

          {error && (
            <div className="mt-5 text-[13px] text-red-400 text-center">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-9 pb-10 text-center">
          <p className="text-[11px] text-text-faint leading-[1.8]">
            By continuing you agree to our{' '}
            <span className="text-text-muted underline underline-offset-2 cursor-pointer">Terms</span>
            {' '}and{' '}
            <span className="text-text-muted underline underline-offset-2 cursor-pointer">Privacy Policy</span>.
          </p>
        </div>

      </div>
    </div>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
