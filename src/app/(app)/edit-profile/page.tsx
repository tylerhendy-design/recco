'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { StatusBar } from '@/components/ui/StatusBar'
import { fetchUserPicks, addPick, removePick, type Pick } from '@/lib/data/picks'

const PRESET_CATEGORIES = ['Restaurant', 'Film', 'TV Series', 'Book', 'Podcast', 'Music']

export default function EditProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)

  // Username
  const [username, setUsername] = useState('')
  const [currentUsername, setCurrentUsername] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Picks
  const [picks, setPicks] = useState<Pick[]>([])
  const [showAddPick, setShowAddPick] = useState(false)
  const [newCategory, setNewCategory] = useState(PRESET_CATEGORIES[0])
  const [customCategory, setCustomCategory] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [addingPick, setAddingPick] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const [{ data }, p] = await Promise.all([
        supabase.from('profiles').select('username').eq('id', user.id).single(),
        fetchUserPicks(user.id),
      ])
      if (data) {
        setUsername(data.username)
        setCurrentUsername(data.username)
      }
      setPicks(p)
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
    if (updateError) { setError(updateError.message); setSaving(false); return }
    router.back()
  }

  async function handleAddPick() {
    if (!userId || !newTitle.trim()) return
    const category = newCategory === 'Custom' ? customCategory.trim() : newCategory
    if (!category) return
    setAddingPick(true)
    const { error } = await addPick(userId, category, newTitle)
    if (!error) {
      const updated = await fetchUserPicks(userId)
      setPicks(updated)
      setNewTitle('')
      setCustomCategory('')
      setShowAddPick(false)
    }
    setAddingPick(false)
  }

  async function handleRemovePick(pickId: string) {
    await removePick(pickId)
    setPicks((prev) => prev.filter((p) => p.id !== pickId))
  }

  const usernameClean = username.toLowerCase().replace(/[^a-z0-9_]/g, '')
  const unchanged = username === currentUsername
  const canSave = usernameClean.length >= 3 && (unchanged || usernameAvailable === true)

  // Group picks by category
  const picksByCategory = picks.reduce<Record<string, Pick[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />

      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <button onClick={() => router.back()} className="text-text-faint p-1 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-white">Edit profile</span>
        <div className="w-8" />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-6 pb-10">

        {/* Username */}
        <div className="pt-2 pb-6 border-b border-bg-card">
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
              {checkingUsername && <span className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin block" />}
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
          {usernameAvailable === false && <p className="text-[12px] text-red-400 mt-1.5">That username is taken.</p>}
          {!unchanged && usernameAvailable === true && <p className="text-[12px] text-green-400 mt-1.5">@{usernameClean} is available.</p>}
          {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}
          <button
            onClick={save}
            disabled={!canSave || saving}
            className="w-full mt-4 bg-accent text-accent-fg py-3.5 rounded-btn text-[15px] font-bold disabled:opacity-40 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save username'}
          </button>
        </div>

        {/* Picks */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[15px] font-semibold text-white">I'd recommend to anyone</div>
              <div className="text-[12px] text-text-faint mt-0.5">Visible on your profile</div>
            </div>
            <button
              onClick={() => setShowAddPick((v) => !v)}
              className="px-3 py-1.5 rounded-chip border border-accent text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
            >
              {showAddPick ? 'Cancel' : '+ Add'}
            </button>
          </div>

          {/* Add pick form */}
          {showAddPick && (
            <div className="bg-bg-card border border-border rounded-card p-4 mb-5">
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] block mb-1.5">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-bg-base border border-border rounded-input px-3 py-2.5 text-[14px] text-white focus:outline-none focus:border-accent"
                >
                  {PRESET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="Custom">Custom…</option>
                </select>
              </div>
              {newCategory === 'Custom' && (
                <div className="mb-3">
                  <input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Category name"
                    className="w-full bg-bg-base border border-border rounded-input px-3 py-2.5 text-[14px] text-white placeholder:text-text-faint focus:outline-none focus:border-accent"
                  />
                </div>
              )}
              <div className="mb-3">
                <label className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] block mb-1.5">Title</label>
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Barrafina, The Bear, Dune…"
                  className="w-full bg-bg-base border border-border rounded-input px-3 py-2.5 text-[14px] text-white placeholder:text-text-faint focus:outline-none focus:border-accent"
                />
              </div>
              <button
                onClick={handleAddPick}
                disabled={addingPick || !newTitle.trim() || (newCategory === 'Custom' && !customCategory.trim())}
                className="w-full py-3 rounded-btn bg-accent text-accent-fg text-[14px] font-bold disabled:opacity-40 transition-opacity"
              >
                {addingPick ? 'Adding…' : 'Add pick'}
              </button>
            </div>
          )}

          {/* Existing picks */}
          {picks.length === 0 && !showAddPick ? (
            <p className="text-[13px] text-text-faint leading-[1.5]">
              Add things you'd recommend to anyone — restaurants, films, books, whatever you love.
            </p>
          ) : (
            Object.entries(picksByCategory).map(([category, items]) => (
              <div key={category} className="mb-5">
                <div className="text-[12px] font-semibold text-accent mb-2">{category}</div>
                {items.map((pick) => (
                  <div key={pick.id} className="flex items-center justify-between py-2.5 border-b border-[#0e0e10] last:border-0">
                    <span className="text-[14px] text-white">{pick.title}</span>
                    <button
                      onClick={() => handleRemovePick(pick.id)}
                      className="text-text-faint hover:text-red-400 transition-colors pl-4"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
