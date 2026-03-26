'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusBar } from '@/components/ui/StatusBar'

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [currentUsername, setCurrentUsername] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
      if (data) {
        setUsername(data.username)
        setCurrentUsername(data.username)
      }
    })
  }, [])

  useEffect(() => {
    if (username.length < 3 || username === currentUsername) {
      setUsernameAvailable(null)
      return
    }
    const t = setTimeout(async () => {
      setCheckingUsername(true)
      let query = supabase.from('profiles').select('id').eq('username', username.toLowerCase())
      if (userId) query = query.neq('id', userId)
      const { data } = await query.maybeSingle()
      setUsernameAvailable(!data)
      setCheckingUsername(false)
    }, 400)
    return () => clearTimeout(t)
  }, [username, userId, currentUsername])

  async function save() {
    if (!userId) return
    if (username === currentUsername) { router.back(); return }
    if (usernameAvailable === false) return

    setSaving(true)
    setError(null)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.toLowerCase().trim() })
      .eq('id', userId)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    router.back()
  }

  const usernameClean = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
  const unchanged = username === currentUsername
  const canSave = usernameClean.length >= 3 && (unchanged || usernameAvailable === true)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <button onClick={() => router.back()} className="text-text-faint p-1 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-white">Edit profile</span>
        <div className="w-8" />
      </div>

      <div className="flex-1 flex flex-col px-8 pt-6 pb-10">
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
              maxLength={30}
              autoFocus
              className="w-full bg-bg-card border border-border rounded-input pl-8 pr-10 py-3.5 text-[15px] text-white placeholder:text-text-faint focus:outline-none focus:border-accent"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {checkingUsername && (
                <span className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin block" />
              )}
              {!checkingUsername && !unchanged && usernameAvailable === true && (
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
          {!unchanged && usernameAvailable === true && (
            <p className="text-[12px] text-green-400 mt-1.5">@{usernameClean} is available.</p>
          )}
        </div>

        {error && <p className="mt-4 text-[13px] text-red-400">{error}</p>}

        <div className="mt-auto pt-8">
          <button
            onClick={save}
            disabled={!canSave || saving}
            className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
