'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusBar } from '@/components/ui/StatusBar'

export default function SetupProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-fill display name from OAuth metadata, store userId for availability check
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
      const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''
      if (name) setDisplayName(name)
    })
  }, [])

  // Check username availability with debounce — exclude the current user's own row
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null)
      return
    }
    const t = setTimeout(async () => {
      setCheckingUsername(true)
      let query = supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
      if (userId) query = query.neq('id', userId)
      const { data } = await query.maybeSingle()
      setUsernameAvailable(!data)
      setCheckingUsername(false)
    }, 400)
    return () => clearTimeout(t)
  }, [username, userId])

  async function save() {
    if (!displayName.trim() || !username.trim()) return
    if (usernameAvailable === false) return

    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // The trigger already created the profile row on signup — just update it
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim(),
        username: username.toLowerCase().trim(),
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.push('/welcome')
  }

  const usernameClean = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
  const canSave = displayName.trim().length > 0 && usernameClean.length >= 3 && usernameAvailable === true

  return (
    <div className="min-h-svh bg-[#d8d8d8] flex items-center justify-center">
      <div className="relative flex flex-col w-full md:w-[390px] min-h-svh md:h-[844px] md:min-h-0 bg-bg-base md:rounded-[48px] md:border md:border-[#2a2a2e] md:shadow-phone md:overflow-hidden font-sans">
        <StatusBar />

        <div className="flex-1 flex flex-col px-8 pt-10 pb-10">
          <div className="mb-10">
            <div className="text-[26px] font-bold text-white tracking-[-0.7px] leading-[1.2] mb-2">
              Set up your profile
            </div>
            <div className="text-[14px] text-text-muted leading-[1.6]">
              Friends will find you by your username.
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {/* Display name */}
            <div>
              <label className="text-[11px] font-semibold text-text-muted tracking-[0.5px] uppercase block mb-2">
                Your name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Tyler Hendy"
                autoFocus
                className="w-full bg-bg-card border border-border rounded-input px-4 py-3.5 text-[15px] text-white placeholder:text-text-faint focus:outline-none focus:border-accent"
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-[11px] font-semibold text-text-muted tracking-[0.5px] uppercase block mb-2">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-faint text-[15px]">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="yourname"
                  maxLength={30}
                  className="w-full bg-bg-card border border-border rounded-input pl-8 pr-10 py-3.5 text-[15px] text-white placeholder:text-text-faint focus:outline-none focus:border-accent"
                />
                {/* Availability indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {checkingUsername && (
                    <span className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin block" />
                  )}
                  {!checkingUsername && usernameAvailable === true && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round">
                      <circle cx="8" cy="8" r="7"/><path d="M5 8l2 2 4-4"/>
                    </svg>
                  )}
                  {!checkingUsername && usernameAvailable === false && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                      <circle cx="8" cy="8" r="7"/><path d="M5 5l6 6M11 5l-6 6"/>
                    </svg>
                  )}
                </div>
              </div>
              {usernameAvailable === false && (
                <p className="text-[12px] text-red-400 mt-1.5">That username is taken.</p>
              )}
              {usernameAvailable === true && (
                <p className="text-[12px] text-green-400 mt-1.5">@{usernameClean} is available.</p>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 text-[13px] text-red-400">{error}</div>
          )}

          <div className="mt-auto pt-8">
            <button
              onClick={save}
              disabled={!canSave || saving}
              className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold disabled:opacity-40 transition-opacity"
            >
              {saving ? 'Saving…' : 'Let\'s go'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
