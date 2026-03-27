'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { CategoryChip } from '@/components/ui/CategoryChip'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import { fetchUserPicks, addPick, updatePick, removePick, type Pick } from '@/lib/data/picks'
import { fetchAllSinBinnedBy } from '@/lib/data/sinbin'
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
  const [showStinkers, setShowStinkers] = useState(false)
  const [sinBinStatuses, setSinBinStatuses] = useState<Array<{ category: string; bad_count: number; recipient_name: string; offences: string[] }>>([])


  // Add pick form
  const [showAddPick, setShowAddPick] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null)
  const [customCategoryName, setCustomCategoryName] = useState('')
  const [newPickTitle, setNewPickTitle] = useState('')
  const [newPickWhy, setNewPickWhy] = useState('')
  const [newPickCity, setNewPickCity] = useState('')
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
  const [editCity, setEditCity] = useState('')
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

      const sinBinned = await fetchAllSinBinnedBy(user.id)
      setSinBinStatuses(sinBinned.map((e) => ({
        category: e.category,
        bad_count: e.bad_count,
        recipient_name: e.recipient_name,
        offences: e.offences,
      })))

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
    const locationStr = newPickCity.trim() ? await geocodeCity(newPickCity.trim()) : ''
    const { error } = await addPick(profile.id, category, newPickTitle, newPickWhy, newPickLinks, locationStr)
    if (!error) {
      const updated = await fetchUserPicks(profile.id)
      setPicks(updated)
      setNewPickTitle('')
      setNewPickWhy('')
      setNewPickCity('')
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
    setEditCity(pick.location ? pick.location.split(',')[0].trim() : '')
    setEditLinks(pick.links.length > 0 ? pick.links : [''])
    setMenuOpenId(null)
  }

  async function handleSaveEdit() {
    if (!editingPick || !editTitle.trim()) return
    setSavingEdit(true)
    const editLocation = editCity.trim() ? await geocodeCity(editCity.trim()) : ''
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
    <div className="flex flex-col flex-1 overflow-hidden relative">
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
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[20px] font-bold text-white tracking-[-0.4px]">{profile.display_name}</div>
                  <button onClick={() => router.push('/edit-profile')} className="text-text-faint hover:text-white transition-colors flex-shrink-0">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                    </svg>
                  </button>
                </div>
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
              <StatBox value={String(profile.stinkers_sent)} label="Stinkers sent" danger onPress={() => setShowStinkers(true)} />
            </div>
          </div>

          {/* Sin bin statuses */}
          {sinBinStatuses.length > 0 && (
            <div className="mx-4 mt-4 rounded-card border border-bad/30 bg-bad/5 overflow-hidden">
              {sinBinStatuses.map((entry, i) => (
                <div key={i} className="px-4 py-3 border-b border-bad/10 last:border-0">
                  <div className="text-[11px] font-semibold text-bad tracking-[0.6px] uppercase mb-1">Sin bin</div>
                  <div className="text-[13px] text-white leading-[1.5]">
                    You are in <span className="font-semibold">{entry.recipient_name.split(' ')[0]}'s</span> sin bin for{' '}
                    <span className="font-semibold">{entry.bad_count} bad {getCategoryLabel(entry.category).toLowerCase()} recos</span>.
                  </div>
                  {entry.offences.length > 0 && (
                    <div className="text-[12px] text-bad/80 mt-1">
                      {entry.offences.join(', ')}.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Picks */}
          <div className="px-6 pt-5">
            <h1 className="text-[20px] font-bold text-white tracking-[-0.4px] mb-4">
              I'd recommend to anyone
            </h1>

            {/* Add CTA */}
            {!showAddPick && (
              <button
                onClick={() => { setShowAddPick(true); setSelectedCategory(null); setNewPickTitle('') }}
                className="w-full flex items-center justify-center gap-2 py-3.5 mb-4 rounded-btn border border-dashed border-accent/40 text-accent text-[14px] font-semibold hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add reco
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
                      City <span className="normal-case font-normal text-[11px] text-red-400">required</span>
                    </div>
                    <input
                      value={newPickCity}
                      onChange={(e) => setNewPickCity(e.target.value)}
                      placeholder="e.g. London"
                      className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-white placeholder:text-text-faint outline-none focus:border-accent"
                    />
                  </div>
                )}

                {/* Why */}
                {selectedCategory && (
                  <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-4">
                    <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase mb-3">Why?</div>
                    <textarea
                      value={newPickWhy}
                      onChange={(e) => setNewPickWhy(e.target.value)}
                      placeholder="What makes it worth recommending…"
                      rows={3}
                      className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-text-secondary outline-none placeholder:text-border font-sans resize-none"
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
                    disabled={addingPick || !newPickTitle.trim() || (selectedCategory === 'custom' && !customCategoryName.trim()) || (selectedCategory === 'restaurant' && !newPickCity.trim())}
                    className="w-full py-4 rounded-btn bg-accent text-accent-fg text-[15px] font-bold disabled:opacity-40 transition-opacity"
                  >
                    {addingPick ? 'Adding…' : 'Add reco'}
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
                // Group by city within this category
                const byCityMap = items.reduce<Record<string, Pick[]>>((acc, p) => {
                  const city = p.location ? p.location.split(',')[0].trim() : ''
                  const k = city || '__none__'
                  if (!acc[k]) acc[k] = []
                  acc[k].push(p)
                  return acc
                }, {})
                const hasCities = Object.keys(byCityMap).some((k) => k !== '__none__')
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
                        {hasCities
                          ? Object.entries(byCityMap).map(([cityKey, cityPicks]) => (
                              <div key={cityKey}>
                                {cityKey !== '__none__' && (
                                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-text-faint tracking-[0.6px] uppercase border-b border-[#0e0e10]">
                                    {cityKey}
                                  </div>
                                )}
                                {cityPicks.map((pick) => (
                                  <PickRow
                                    key={pick.id}
                                    pick={pick}
                                    editingPick={editingPick}
                                    editTitle={editTitle} setEditTitle={setEditTitle}
                                    editCity={editCity} setEditCity={setEditCity}
                                    editWhy={editWhy} setEditWhy={setEditWhy}
                                    editLinks={editLinks} setEditLinks={setEditLinks}
                                    savingEdit={savingEdit}
                                    menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId}
                                    onSave={handleSaveEdit}
                                    onCancel={() => setEditingPick(null)}
                                    onEdit={startEdit}
                                    onDelete={handleRemovePick}
                                  />
                                ))}
                              </div>
                            ))
                          : items.map((pick) => (
                              <PickRow
                                key={pick.id}
                                pick={pick}
                                editingPick={editingPick}
                                editTitle={editTitle} setEditTitle={setEditTitle}
                                editCity={editCity} setEditCity={setEditCity}
                                editWhy={editWhy} setEditWhy={setEditWhy}
                                editLinks={editLinks} setEditLinks={setEditLinks}
                                savingEdit={savingEdit}
                                menuOpenId={menuOpenId} setMenuOpenId={setMenuOpenId}
                                onSave={handleSaveEdit}
                                onCancel={() => setEditingPick(null)}
                                onEdit={startEdit}
                                onDelete={handleRemovePick}
                              />
                            ))
                        }
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Sign out */}
          <div className="flex justify-center pt-10 pb-6">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="text-[14px] text-text-faint hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>

        </div>
      ) : null}

      {/* Stinkers overlay */}
      {showStinkers && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowStinkers(false)}>
          <div className="fixed inset-0 bg-black/60" />
          <div className="relative w-full bg-bg-base rounded-t-[28px] px-7 pt-6 pb-10" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-6" />
            <div className="text-[11px] font-semibold text-[#A07850] tracking-[1px] uppercase mb-2">Your track record</div>
            <div className="text-[22px] font-bold text-white tracking-[-0.5px] leading-[1.2] mb-4">
              What's a stinker?
            </div>
            <p className="text-[15px] text-text-muted leading-[1.7] mb-4">
              A stinker is a recommendation you sent that scored below 40. You said it would be good, and it wasn't. Three stinkers in the same category and you're sin-binned: blocked from sending more until you're let back in. Fool me three times…
            </p>
            <p className="text-[15px] text-text-muted leading-[1.7]">
              Why do we have stinkers? Every rating — good or bad — helps you learn what someone actually likes. Reco works because recommendations come from real taste. Every stinker chips away at that. Harsh but fair.
            </p>
            <button
              onClick={() => setShowStinkers(false)}
              className="w-full mt-7 py-4 rounded-btn bg-bg-card border border-border text-[15px] font-semibold text-white"
            >
              Got it
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

function StatBox({ value, label, danger, onPress }: { value: string; label: string; danger?: boolean; onPress?: () => void }) {
  return (
    <div
      className={`flex-1 bg-bg-card rounded-input p-2.5 text-center ${onPress ? 'cursor-pointer active:opacity-70' : ''}`}
      onClick={onPress}
    >
      <div className={`text-[20px] font-bold ${danger ? 'text-bad' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-text-faint mt-0.5">{label}</div>
    </div>
  )
}

async function geocodeCity(city: string): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&featuretype=city`,
      { headers: { 'User-Agent': 'RecoApp/1.0' } }
    )
    const data = await res.json()
    if (data?.[0]?.display_name) {
      const parts: string[] = data[0].display_name.split(',')
      const country = parts[parts.length - 1].trim()
      return `${city.trim()}, ${country}`
    }
  } catch {}
  return city.trim()
}

function PickRow({ pick, editingPick, editTitle, setEditTitle, editCity, setEditCity, editWhy, setEditWhy, editLinks, setEditLinks, savingEdit, menuOpenId, setMenuOpenId, onSave, onCancel, onEdit, onDelete }: {
  pick: Pick
  editingPick: Pick | null
  editTitle: string; setEditTitle: (v: string) => void
  editCity: string; setEditCity: (v: string) => void
  editWhy: string; setEditWhy: (v: string) => void
  editLinks: string[]; setEditLinks: (v: string[]) => void
  savingEdit: boolean
  menuOpenId: string | null; setMenuOpenId: (v: string | null) => void
  onSave: () => void; onCancel: () => void
  onEdit: (p: Pick) => void; onDelete: (id: string) => void
}) {
  return (
    <div className="px-4 py-3 border-b border-[#0e0e10] last:border-0">
      {editingPick?.id === pick.id ? (
        <div className="flex flex-col gap-2.5">
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-white outline-none focus:border-accent" />
          {pick.category === 'restaurant' && (
            <input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="City" className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white placeholder:text-text-faint outline-none focus:border-accent" />
          )}
          <textarea value={editWhy} onChange={(e) => setEditWhy(e.target.value)} placeholder="Why? (optional)" rows={3} className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white placeholder:text-text-faint outline-none focus:border-accent resize-none font-sans" />
          {editLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={link} onChange={(e) => { const n = [...editLinks]; n[i] = e.target.value; setEditLinks(n) }} placeholder="Link (optional)" className="flex-1 bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white placeholder:text-text-faint outline-none focus:border-accent" />
              {editLinks.length > 1 && (
                <button onClick={() => setEditLinks(editLinks.filter((_, j) => j !== i))} className="text-text-faint hover:text-red-400 transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setEditLinks([...editLinks, ''])} className="text-[11px] text-text-faint hover:text-accent transition-colors text-left">+ Add link</button>
          <div className="flex gap-2 mt-1">
            <button onClick={onCancel} className="flex-1 py-2 border border-border rounded-input text-[12px] font-semibold text-text-dim">Cancel</button>
            <button onClick={onSave} disabled={savingEdit || !editTitle.trim()} className="flex-[2] py-2 rounded-input bg-accent text-accent-fg text-[12px] font-bold disabled:opacity-40">
              {savingEdit ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-medium text-white">{pick.title}</div>
            {pick.why && <div className="text-[12px] text-text-muted mt-0.5 leading-[1.5]">{pick.why}</div>}
            {pick.links.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {pick.links.map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent underline underline-offset-2">{getLinkLabel(link)}</a>
                ))}
              </div>
            )}
          </div>
          <div className="relative flex-shrink-0">
            <button onClick={() => setMenuOpenId(menuOpenId === pick.id ? null : pick.id)} className="text-text-faint hover:text-white transition-colors p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            </button>
            {menuOpenId === pick.id && (
              <div className="absolute right-0 top-7 z-50 bg-bg-card border border-border rounded-card shadow-lg overflow-hidden min-w-[110px]">
                <button onClick={() => onEdit(pick)} className="w-full px-4 py-2.5 text-left text-[13px] text-white hover:bg-bg-base transition-colors">Edit</button>
                <button onClick={() => onDelete(pick.id)} className="w-full px-4 py-2.5 text-left text-[13px] text-red-400 hover:bg-bg-base transition-colors">Delete</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getLinkLabel(url: string): string {
  try {
    const u = new URL(url)
    const h = u.hostname.replace('www.', '')
    if (h.includes('instagram.com')) return 'Instagram'
    if (h.includes('twitter.com') || h.includes('x.com')) return 'X / Twitter'
    if (h.includes('google.com') && u.pathname.includes('maps')) return 'Google Maps'
    if (h.includes('maps.google.com') || h.includes('goo.gl')) return 'Google Maps'
    if (h.includes('maps.apple.com')) return 'Apple Maps'
    if (h.includes('spotify.com')) return 'Spotify'
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'YouTube'
    if (h.includes('facebook.com')) return 'Facebook'
    if (h.includes('tiktok.com')) return 'TikTok'
    if (h.includes('tripadvisor.com')) return 'TripAdvisor'
    if (h.includes('yelp.com')) return 'Yelp'
    if (h.includes('opentable.com')) return 'OpenTable'
    if (h.includes('resy.com')) return 'Resy'
    if (h.includes('imdb.com')) return 'IMDb'
    if (h.includes('netflix.com')) return 'Netflix'
    if (h.includes('goodreads.com')) return 'Goodreads'
    if (h.includes('amazon.')) return 'Amazon'
    if (h.includes('apple.com')) return 'Apple'
    return 'Website'
  } catch {
    return 'Link'
  }
}
