'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { CategoryChip } from '@/components/ui/CategoryChip'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import { fetchUserPicks, addPick, updatePick, removePick, type Pick } from '@/lib/data/picks'
import { CATEGORIES, type CategoryId, getCategoryColor, getCategoryLabel } from '@/constants/categories'

type ProfileStats = {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  joined_at: string
  recos_sent: number
  friends_count: number
  recos_completed: number
  stinkers_sent: number
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileStats | null>(null)
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [memberNumber, setMemberNumber] = useState<number | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  // Add pick form
  const [showAddPick, setShowAddPick] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null)
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [newPickTitle, setNewPickTitle] = useState('')
  const [newPickWhy, setNewPickWhy] = useState('')
  const [newPickLocation, setNewPickLocation] = useState('')
  const [newPickLinks, setNewPickLinks] = useState<string[]>([''])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [addingPick, setAddingPick] = useState(false)

  // Collapsed state per category (all start collapsed)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Pick menu + edit
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editingPick, setEditingPick] = useState<Pick | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editWhy, setEditWhy] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editLinks, setEditLinks] = useState<string[]>([''])
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [
        { data: prof },
        { data: sentRecos },
        { count: friendsCount },
        { count: recosCompleted },
        userPicks,
      ] = await Promise.all([
        supabase.from('profiles').select('id, display_name, username, avatar_url, joined_at').eq('id', user.id).single(),
        supabase.from('recommendations').select('id').eq('sender_id', user.id),
        supabase.from('friend_connections').select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted'),
        supabase.from('reco_recipients').select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('status', 'done'),
        fetchUserPicks(user.id),
      ])

      const sentIds = sentRecos?.map((r) => r.id) ?? []
      let stinkersSent = 0
      if (sentIds.length > 0) {
        const { count } = await supabase
          .from('reco_recipients')
          .select('*', { count: 'exact', head: true })
          .in('reco_id', sentIds)
          .eq('status', 'done')
          .lt('score', 40)
        stinkersSent = count ?? 0
      }

      if (prof) {
        setProfile({
          id: user.id,
          display_name: prof.display_name,
          username: prof.username,
          avatar_url: prof.avatar_url,
          joined_at: prof.joined_at,
          recos_sent: sentIds.length,
          friends_count: friendsCount ?? 0,
          recos_completed: recosCompleted ?? 0,
          stinkers_sent: stinkersSent,
        })
      }

      setPicks(userPicks)

      if (prof?.joined_at) {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .lte('joined_at', prof.joined_at)
        setMemberNumber(count ?? 1)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleAddPick() {
    if (!profile || !selectedCategory || !newPickTitle.trim()) return
    const category = selectedCategory === 'custom' ? customCategoryName.trim() : selectedCategory
    if (!category) return
    setAddingPick(true)
    const { error } = await addPick(profile.id, category, newPickTitle, newPickWhy, newPickLinks, newPickLocation)
    if (!error) {
      const updated = await fetchUserPicks(profile.id)
      setPicks(updated)
      setNewPickTitle('')
      setNewPickWhy('')
      setNewPickLocation('')
      setNewPickLinks([''])
      setCustomCategoryName('')
      setSelectedCategory(null)
      setDetailsOpen(false)
      setShowAddPick(false)
    }
    setAddingPick(false)
  }

  async function handleRemovePick(pickId: string) {
    await removePick(pickId)
    setPicks((prev) => prev.filter((p) => p.id !== pickId))
    setMenuOpenId(null)
  }

  function startEdit(pick: Pick) {
    setEditingPick(pick)
    setEditTitle(pick.title)
    setEditWhy(pick.why ?? '')
    setEditLocation(pick.location ?? '')
    setEditLinks(pick.links.length > 0 ? pick.links : [''])
    setMenuOpenId(null)
  }

  async function handleSaveEdit() {
    if (!editingPick || !editTitle.trim()) return
    setSavingEdit(true)
    const { error } = await updatePick(editingPick.id, editTitle, editWhy, editLinks, editLocation)
    if (!error && profile) {
      const updated = await fetchUserPicks(profile.id)
      setPicks(updated)
      setEditingPick(null)
    }
    setSavingEdit(false)
  }

  function toggleExpanded(category: string) {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const joinYear = profile?.joined_at ? new Date(profile.joined_at).getFullYear() : null

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
        <span className="text-[15px] font-semibold text-white">Profile</span>
        <div className="w-8" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : profile ? (
        <div className="flex-1 overflow-y-auto scrollbar-none pb-6">

          {/* Avatar + name */}
          <div className="px-6 pb-6 border-b border-bg-card">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-[#1e1c04] border-2 border-accent flex items-center justify-center text-[20px] font-bold text-accent flex-shrink-0 overflow-hidden">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                  : initials(profile.display_name)
                }
              </div>
              <div>
                <div className="text-[20px] font-bold text-white tracking-[-0.4px]">{profile.display_name}</div>
                <div className="text-[13px] text-text-faint mt-0.5">
                  @{profile.username}{memberNumber ? ` · #${memberNumber}` : ''}{joinYear ? ` · joined ${joinYear}` : ''}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mb-2.5">
              <StatBox value={String(profile.recos_sent)} label="Recos sent" />
              <StatBox value={String(profile.friends_count)} label="Friends" />
            </div>
            <div className="flex gap-2.5">
              <StatBox value={String(profile.recos_completed)} label="Completed" />
              <StatBox value={String(profile.stinkers_sent)} label="Stinkers sent" danger />
            </div>
          </div>

          {/* Picks */}
          <div className="px-6 pt-5">
            <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-text-faint mb-4">
              I'd recommend to anyone
            </div>

            {/* Add CTA */}
            {!showAddPick && (
              <button
                onClick={() => { setShowAddPick(true); setSelectedCategory(null); setNewPickTitle('') }}
                className="w-full flex items-center justify-center gap-2 py-3.5 mb-4 rounded-btn border border-dashed border-accent/40 text-accent text-[14px] font-semibold hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add a pick
              </button>
            )}

            {/* Add form */}
            {showAddPick && (
              <div className="flex flex-col gap-3 mb-4">

                {/* Category */}
                <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase">Category</div>
                    <button onClick={() => { setShowAddPick(false); setSelectedCategory(null); setNewPickTitle(''); setNewPickWhy(''); setNewPickLinks(['']); setDetailsOpen(false) }} className="text-[12px] text-text-faint hover:text-white transition-colors">Cancel</button>
                  </div>
                  <div className="flex flex-wrap gap-[7px]">
                    {CATEGORIES.map((cat) => (
                      <CategoryChip
                        key={cat.id}
                        id={cat.id}
                        selected={selectedCategory === cat.id}
                        dashed={cat.id === 'custom'}
                        onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                      />
                    ))}
                  </div>
                  {selectedCategory === 'custom' && (
                    <input
                      value={customCategoryName}
                      onChange={(e) => setCustomCategoryName(e.target.value)}
                      placeholder="Category name (e.g. Architects, Barbers…)"
                      className="w-full mt-3 bg-bg-base border border-border rounded-input px-3 py-2.5 text-[14px] text-white placeholder:text-text-faint focus:outline-none focus:border-accent"
                    />
                  )}
                </div>

                {/* Name */}
                {selectedCategory && (
                  <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-4">
                    <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase mb-3">Name</div>
                    <input
                      autoFocus
                      value={newPickTitle}
                      onChange={(e) => setNewPickTitle(e.target.value)}
                      placeholder="Name it…"
                      className="bg-transparent outline-none text-white font-sans text-[17px] w-full tracking-[-0.3px] placeholder:text-[#2a2a30]"
                    />
                  </div>
                )}

                {/* Location — required for restaurants */}
                {selectedCategory === 'restaurant' && (
                  <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-4">
                    <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase mb-3">
                      Location <span className="normal-case font-normal text-[11px] text-red-400">required</span>
                    </div>
                    <input
                      value={newPickLocation}
                      onChange={(e) => setNewPickLocation(e.target.value)}
                      placeholder="e.g. Soho, London"
                      className="bg-transparent outline-none text-white font-sans text-[17px] w-full tracking-[-0.3px] placeholder:text-[#2a2a30]"
                    />
                  </div>
                )}

                {/* Why */}
                {selectedCategory && (
                  <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-4">
                    <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase mb-3">Why?</div>
                    <input
                      value={newPickWhy}
                      onChange={(e) => setNewPickWhy(e.target.value)}
                      placeholder="What makes it worth recommending…"
                      className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-text-secondary outline-none placeholder:text-border font-sans"
                    />
                  </div>
                )}

                {/* Links & details — collapsible */}
                {selectedCategory && (
                  <div className="bg-bg-card border border-border rounded-card">
                    <button
                      onClick={() => setDetailsOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-4 py-3.5 active:opacity-60 transition-opacity"
                    >
                      <span className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase">
                        Links &amp; details
                        <span className="ml-1.5 normal-case font-normal text-[11px] text-text-faint">optional</span>
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#777780" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-200 flex-shrink-0 ${detailsOpen ? 'rotate-180' : ''}`}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {detailsOpen && (
                      <div className="border-t border-border px-4 pt-4 pb-4 flex flex-col gap-2">
                        {newPickLinks.map((link, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="flex items-center gap-2 flex-1 bg-bg-base border border-border rounded-input px-3 py-2">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0">
                                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                              </svg>
                              <input
                                className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-border font-sans"
                                placeholder="Paste a URL…"
                                value={link}
                                onChange={(e) => { const n = [...newPickLinks]; n[i] = e.target.value; setNewPickLinks(n) }}
                              />
                            </div>
                            {newPickLinks.length > 1 && (
                              <button onClick={() => setNewPickLinks(newPickLinks.filter((_, j) => j !== i))} className="text-text-faint hover:text-red-400 transition-colors">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => setNewPickLinks([...newPickLinks, ''])} className="flex items-center gap-1.5 text-[12px] font-semibold text-text-dim hover:text-text-secondary transition-colors mt-0.5">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                          </svg>
                          Add another link
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit */}
                {selectedCategory && (
                  <button
                    onClick={handleAddPick}
                    disabled={addingPick || !newPickTitle.trim() || (selectedCategory === 'custom' && !customCategoryName.trim()) || (selectedCategory === 'restaurant' && !newPickLocation.trim())}
                    className="w-full py-4 rounded-btn bg-accent text-accent-fg text-[15px] font-bold disabled:opacity-40 transition-opacity"
                  >
                    {addingPick ? 'Adding…' : 'Add pick'}
                  </button>
                )}
              </div>
            )}

            {/* Picks list */}
            {picks.length === 0 && !showAddPick ? (
              <p className="text-[13px] text-text-faint leading-[1.5] pb-4">
                Add your favourite restaurants, films, books and more. The stuff that shows people who you are. The stuff that changed your life.
              </p>
            ) : (
              Object.entries(picksByCategory).map(([category, items]) => {
                const color = getCategoryColor(category)
                const isOpen = expanded[category] ?? false
                return (
                  <div key={category} className="border border-border rounded-card mb-2">
                    <button
                      onClick={() => toggleExpanded(category)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-card transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[13px] font-semibold text-white">{getCategoryLabel(category)}</span>
                        <span className="text-[11px] text-text-faint">{items.length}</span>
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#6e6e78" strokeWidth="2" strokeLinecap="round"
                        className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border">
                        {items.map((pick) => (
                          <div key={pick.id} className="px-4 py-3 border-b border-[#0e0e10] last:border-0">
                            {editingPick?.id === pick.id ? (
                              /* Inline edit form */
                              <div className="flex flex-col gap-2.5">
                                <input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-white outline-none focus:border-accent"
                                />
                                {pick.category === 'restaurant' && (
                                  <input
                                    value={editLocation}
                                    onChange={(e) => setEditLocation(e.target.value)}
                                    placeholder="Location"
                                    className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white placeholder:text-text-faint outline-none focus:border-accent"
                                  />
                                )}
                                <input
                                  value={editWhy}
                                  onChange={(e) => setEditWhy(e.target.value)}
                                  placeholder="Why? (optional)"
                                  className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white placeholder:text-text-faint outline-none focus:border-accent"
                                />
                                {editLinks.map((link, i) => (
                                  <div key={i} className="flex items-center gap-2">
                                    <input
                                      value={link}
                                      onChange={(e) => { const n = [...editLinks]; n[i] = e.target.value; setEditLinks(n) }}
                                      placeholder="Link (optional)"
                                      className="flex-1 bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white placeholder:text-text-faint outline-none focus:border-accent"
                                    />
                                    {editLinks.length > 1 && (
                                      <button onClick={() => setEditLinks(editLinks.filter((_, j) => j !== i))} className="text-text-faint hover:text-red-400 transition-colors">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                      </button>
                                    )}
                                  </div>
                                ))}
                                <button onClick={() => setEditLinks([...editLinks, ''])} className="text-[11px] text-text-faint hover:text-accent transition-colors text-left">+ Add link</button>
                                <div className="flex gap-2 mt-1">
                                  <button onClick={() => setEditingPick(null)} className="flex-1 py-2 border border-border rounded-input text-[12px] font-semibold text-text-dim">Cancel</button>
                                  <button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()} className="flex-[2] py-2 rounded-input bg-accent text-accent-fg text-[12px] font-bold disabled:opacity-40">
                                    {savingEdit ? 'Saving…' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Normal view */
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="text-[14px] font-medium text-white">{pick.title}</div>
                                  {pick.location && <div className="text-[12px] text-text-faint mt-0.5">{pick.location}</div>}
                                  {pick.why && <div className="text-[12px] text-text-muted mt-0.5 leading-[1.5]">{pick.why}</div>}
                                  {pick.links.length > 0 && (
                                    <div className="flex flex-col gap-0.5 mt-1.5">
                                      {pick.links.map((link, i) => (
                                        <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent underline underline-offset-2 truncate">{link}</a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="relative flex-shrink-0">
                                  <button
                                    onClick={() => setMenuOpenId(menuOpenId === pick.id ? null : pick.id)}
                                    className="text-text-faint hover:text-white transition-colors p-1"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                      <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
                                    </svg>
                                  </button>
                                  {menuOpenId === pick.id && (
                                    <div className="absolute right-0 top-7 z-50 bg-bg-card border border-border rounded-card shadow-lg overflow-hidden min-w-[110px]">
                                      <button
                                        onClick={() => startEdit(pick)}
                                        className="w-full px-4 py-2.5 text-left text-[13px] text-white hover:bg-bg-base transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleRemovePick(pick.id)}
                                        className="w-full px-4 py-2.5 text-left text-[13px] text-red-400 hover:bg-bg-base transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Settings */}
          <div className="mt-4">
            <SettingsRow label="Profile settings" onPress={() => router.push('/edit-profile')} />
          </div>

          {/* Sign out */}
          <div className="px-6 pt-6">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="w-full py-4 rounded-btn border border-border text-[15px] font-semibold text-red-400 hover:border-red-400 transition-colors disabled:opacity-40"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>

        </div>
      ) : null}
    </div>
  )
}

function StatBox({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <div className="flex-1 bg-bg-card rounded-input p-2.5 text-center">
      <div className={`text-[20px] font-bold ${danger ? 'text-red-400' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-text-faint mt-0.5">{label}</div>
    </div>
  )
}

function SettingsRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center justify-between px-6 py-4 border-b border-[#0e0e10] hover:bg-bg-card transition-colors"
    >
      <span className="text-[15px] text-white">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}
