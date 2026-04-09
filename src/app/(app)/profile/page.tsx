'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import { fetchUserPicks, addPick, updatePick, removePick, type Pick } from '@/lib/data/picks'
import { fetchAllSinBinnedBy } from '@/lib/data/sinbin'
import { CATEGORIES, type CategoryId, getCategoryColor, getCategoryLabel } from '@/constants/categories'
import { ProfileStats } from '@/components/ui/ProfileStats'

type ProfileStats = {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  joined_at: string
  recos_sent: number
  friends_count: number
  recos_completed: number
  recos_received: number
  stinkers_sent: number
  hit_rate: number
  avg_score: string
  avg_completion_days: number
  top_category: string | null
  times_forwarded: number
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileStats | null>(null)
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [memberNumber, setMemberNumber] = useState<number | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [showStinkers, setShowStinkers] = useState(false)
  const [profileCopied, setProfileCopied] = useState(false)
  const [stinkerRecos, setStinkerRecos] = useState<{ title: string; category: string; score: number; recipient: string }[]>([])
  const [sinBinStatuses, setSinBinStatuses] = useState<Array<{ category: string; bad_count: number; recipient_name: string; offences: string[] }>>([])

  // Lists
  const [lists, setLists] = useState<{ id: string; title: string; item_count: number; hero_image: string | null }[]>([])

  // Add pick form

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
      setUserId(user.id)

      const [
        { data: prof },
        { data: sentRecos },
        { count: friendsCount },
        { count: recosCompleted },
        userPicks,
      ] = await Promise.all([
        supabase.from('profiles').select('id, display_name, username, avatar_url, joined_at').eq('id', user.id).single(),
        supabase.from('recommendations').select('id, meta').eq('sender_id', user.id),
        supabase.from('friend_connections').select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted'),
        supabase.from('reco_recipients').select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('status', 'done'),
        fetchUserPicks(user.id),
      ])

      // Exclude Quick Add recos (where manual_sender_name exists) from "Given" count
      const actualSentRecos = (sentRecos ?? []).filter((r: any) => !r.meta?.manual_sender_name)
      const sentIds = actualSentRecos.map((r) => r.id)

      // Rich stats queries in parallel
      const [
        { count: stinkersCount },
        { count: recosReceived },
        { data: completionTimes },
        { data: scoredRecos },
        { count: forwardCount },
        { data: topCatData },
      ] = await Promise.all([
        // Stinkers sent
        sentIds.length > 0
          ? supabase.from('reco_recipients').select('*', { count: 'exact', head: true }).in('reco_id', sentIds).eq('status', 'done').lte('score', 3)
          : Promise.resolve({ count: 0 }),
        // Recos received (total)
        supabase.from('reco_recipients').select('*', { count: 'exact', head: true }).eq('recipient_id', user.id),
        // Completion times (for avg time to complete)
        supabase.from('reco_recipients').select('created_at, rated_at').eq('recipient_id', user.id).eq('status', 'done').not('rated_at', 'is', null),
        // All scored recos I sent (for hit rate)
        sentIds.length > 0
          ? supabase.from('reco_recipients').select('score').in('reco_id', sentIds).eq('status', 'done').not('score', 'is', null)
          : Promise.resolve({ data: [] }),
        // Times my recos were forwarded
        sentIds.length > 0
          ? supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('type', 'reco_received').eq('actor_id', user.id).contains('payload', { subtype: 'forwarded' })
          : Promise.resolve({ count: 0 }),
        // Top category sent
        supabase.from('recommendations').select('category').eq('sender_id', user.id),
      ])

      const stinkersSent = stinkersCount ?? 0
      const totalReceived = recosReceived ?? 0

      // Fetch actual stinker details
      if (sentIds.length > 0) {
        const { data: stinkerData } = await supabase
          .from('reco_recipients')
          .select('score, reco_id, recommendations ( title, category ), profiles:recipient_id ( display_name )')
          .in('reco_id', sentIds)
          .eq('status', 'done')
          .lte('score', 3)
          .not('score', 'is', null)
          .order('score', { ascending: true })
        if (stinkerData) {
          setStinkerRecos(stinkerData.map((r: any) => ({
            title: r.recommendations?.title ?? 'Unknown',
            category: r.recommendations?.category ?? 'custom',
            score: r.score,
            recipient: r.profiles?.display_name ?? 'Someone',
          })))
        }
      }

      // Avg time to complete (in days)
      let avgCompletionDays = 0
      if (completionTimes && completionTimes.length > 0) {
        const totalMs = completionTimes.reduce((sum, r) => {
          const diff = new Date(r.rated_at!).getTime() - new Date(r.created_at).getTime()
          return sum + Math.max(0, diff)
        }, 0)
        avgCompletionDays = Math.round(totalMs / completionTimes.length / 86400000)
      }

      // Hit rate (% scored 7+)
      const scores = (scoredRecos ?? []).map((r: any) => r.score).filter((s: number) => s != null)
      const hitRate = scores.length > 0 ? Math.round((scores.filter((s: number) => s >= 7).length / scores.length) * 100) : 0
      const avgScore = scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : '—'

      // Top category
      const catCounts: Record<string, number> = {}
      for (const r of (topCatData ?? [])) {
        catCounts[r.category] = (catCounts[r.category] ?? 0) + 1
      }
      const topCategory = Object.entries(catCounts).sort(([,a], [,b]) => b - a)[0]?.[0] ?? null

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
          recos_received: totalReceived,
          stinkers_sent: stinkersSent,
          hit_rate: hitRate,
          avg_score: avgScore,
          avg_completion_days: avgCompletionDays,
          top_category: topCategory,
          times_forwarded: forwardCount ?? 0,
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

      // Fetch lists
      const { data: listsData } = await supabase
        .from('lists')
        .select('id, title, list_items (id, meta)')
        .eq('owner_id', user.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (listsData) {
        setLists(listsData.map((l: any) => ({
          id: l.id,
          title: l.title,
          item_count: l.list_items?.length ?? 0,
          hero_image: l.list_items?.find((i: any) => i.meta?.artwork_url)?.meta?.artwork_url ?? null,
        })))
      }

      setLoading(false)
    }
    load()
  }, [])

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
    const key = p.category.toLowerCase().trim()
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
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
          <div className="px-6 pb-6 border-b border-bg-card mb-2">
            <div className="flex items-center gap-4 mb-4">
              {/* Profile picture — tappable to change */}
              <label className="relative w-[72px] h-[72px] rounded-full bg-bg-card flex items-center justify-center text-[22px] font-bold text-text-secondary flex-shrink-0 overflow-hidden cursor-pointer">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                  : initials(profile.display_name)
                }
                <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors rounded-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="opacity-0 hover:opacity-100"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !userId) return
                  const ext = file.name.split('.').pop() ?? 'jpg'
                  const path = `${userId}/avatar-${crypto.randomUUID()}.${ext}`
                  const form = new FormData()
                  form.append('file', file)
                  form.append('path', path)
                  const res = await fetch('/api/upload-image', { method: 'POST', body: form })
                  const data = await res.json()
                  if (data.publicUrl) {
                    await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
                    setProfile((p: any) => p ? { ...p, avatar_url: data.publicUrl } : p)
                  }
                }} />
              </label>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="text-[20px] font-bold text-white tracking-[-0.4px]">{profile.display_name}</div>
                  <button onClick={() => router.push('/edit-profile')} className="text-text-faint hover:text-white transition-colors flex-shrink-0 p-1">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/@${profile.username}`); setProfileCopied(true); setTimeout(() => setProfileCopied(false), 2000) }}
                  className="flex items-center gap-1 text-[13px] text-accent mt-0.5"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  {profileCopied ? 'Link copied' : `givemeareco.com/@${profile.username}`}
                </button>
                <div className="text-[13px] text-text-faint mt-0.5">
                  @{profile.username}{memberNumber ? ` · #${memberNumber}` : ''}{joinYear ? ` · joined ${joinYear}` : ''}
                </div>
              </div>
            </div>

            <ProfileStats
              recosSent={profile.recos_sent}
              recosReceived={profile.recos_received}
              recosCompleted={profile.recos_completed}
              stinkersSent={profile.stinkers_sent}
              avgScore={profile.avg_score}
              friendsCount={profile.friends_count}
              hitRate={profile.hit_rate}
              timesForwarded={profile.times_forwarded}
              avgCompletionDays={profile.avg_completion_days}
              topCategory={profile.top_category ?? undefined}
              onStinkersClick={() => setShowStinkers(true)}
            />
          </div>



          {/* Sin bin statuses */}
          {sinBinStatuses.length > 0 && (
            <div className="mx-4 mt-4 rounded-card border border-bad/30 bg-bad/5 overflow-hidden">
              {sinBinStatuses.map((entry, i) => (
                <div key={i} className="px-4 py-3 border-b border-bad/10 last:border-0">
                  <div className="text-[11px] font-semibold text-bad tracking-[0.6px] uppercase mb-1">Sin bin</div>
                  <div className="text-[13px] text-white leading-[1.5]">
                    You are in <span className="font-semibold">{entry.recipient_name}'s</span> sin bin. You gave them{' '}
                    <span className="font-semibold">{entry.bad_count} stinkers which were {getCategoryLabel(entry.category).toLowerCase()}</span>.
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

          {/* TOP 03 — Collapsed categories → grouped by location/type → rich cards */}
          <div className="px-4 pt-5">
            <div className="flex items-baseline justify-between mb-3 px-2">
              <h1 className="text-[22px] font-bold text-white tracking-[-0.5px]">TOP 03</h1>
              <Link href="/profile/top3" className="text-[12px] font-semibold text-accent">+ Add</Link>
            </div>

            {picks.length === 0 ? (
              <div className="px-2 pb-4">
                <p className="text-[14px] text-text-muted leading-[1.6] mb-4">
                  The stuff that shows people who you are. The restaurants that changed your life, the films you never shut up about, the music you play on repeat.
                </p>
                <Link href="/profile/top3" className="inline-flex items-center gap-2 bg-accent text-accent-fg px-5 py-3 rounded-xl text-[14px] font-bold">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Start your TOP 03
                </Link>
              </div>
            ) : (
              Object.entries(picksByCategory).map(([category, items]) => {
                const color = getCategoryColor(category)
                const catLabel = getCategoryLabel(category)
                const isCatOpen = expanded[category] ?? false

                // Group picks by location/type
                const groups = items.reduce<Record<string, Pick[]>>((acc, p) => {
                  const key = p.location?.trim() || 'General'
                  if (!acc[key]) acc[key] = []
                  acc[key].push(p)
                  return acc
                }, {})
                const groupEntries = Object.entries(groups).sort((a, b) => b[1].length - a[1].length)
                const hasMultipleGroups = groupEntries.length > 1 || (groupEntries.length === 1 && groupEntries[0][0] !== 'General')

                // Share a whole group
                async function shareGroup(groupName: string, groupPicks: Pick[]) {
                  const title = groupName === 'General' ? `My Top ${catLabel}` : `My Top ${groupName} ${catLabel}`
                  const lines = groupPicks.map((p, i) => `${i + 1}. ${p.title}${p.why ? ` — "${p.why}"` : ''}`)
                  const text = `${title}\n\n${lines.join('\n')}\n\nvia RECO`
                  const url = window.location.href
                  if (navigator.share) {
                    try { await navigator.share({ title, text, url }); return } catch {}
                  }
                  await navigator.clipboard.writeText(text)
                  setMenuOpenId(`shared-group-${category}-${groupName}`)
                  setTimeout(() => setMenuOpenId(null), 2000)
                }

                return (
                  <div key={category} className="mb-2 border border-border rounded-2xl overflow-hidden bg-bg-card">
                    {/* Category header — collapsed by default */}
                    <button
                      onClick={() => toggleExpanded(category)}
                      className="w-full flex items-center justify-between px-4 py-3.5"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                        <span className="text-[14px] font-bold text-white">{catLabel}</span>
                        <span className={`text-[11px] font-semibold ${items.length >= 3 ? 'text-accent' : 'text-text-faint'}`}>{items.length}</span>
                        {hasMultipleGroups && (
                          <span className="text-[10px] text-text-faint">· {groupEntries.length} groups</span>
                        )}
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"
                        className={`transition-transform duration-200 ${isCatOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
                    </button>

                    {/* Expanded: groups with picks */}
                    {isCatOpen && (
                      <div className="border-t border-border">
                        {groupEntries.map(([groupName, groupPicks]) => {
                          const groupKey = `${category}::${groupName}`
                          const isGroupOpen = expanded[groupKey] ?? false
                          const showGroupHeader = hasMultipleGroups || groupName !== 'General'

                          return (
                            <div key={groupName}>
                              {/* Group header with share */}
                              {showGroupHeader && (
                                <button
                                  onClick={() => toggleExpanded(groupKey)}
                                  className="w-full flex items-center justify-between px-4 py-3 border-b border-border/50 bg-bg-base/30"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-semibold text-white">{groupName}</span>
                                    <span className="text-[11px] text-text-faint">{groupPicks.length}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span
                                      onClick={async (e) => { e.stopPropagation(); await shareGroup(groupName, groupPicks) }}
                                      className="text-[11px] font-semibold text-accent flex items-center gap-1"
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                                      </svg>
                                      {menuOpenId === `shared-group-${category}-${groupName}` ? 'Copied' : 'Share'}
                                    </span>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"
                                      className={`transition-transform duration-200 ${isGroupOpen ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
                                  </div>
                                </button>
                              )}

                              {/* Rich pick cards (show if group is open, or if no sub-groups) */}
                              {(!showGroupHeader || isGroupOpen) && groupPicks.map((pick, idx) => (
                                <div key={pick.id} className="border-b border-border/30 last:border-0">
                                  {/* Card with image */}
                                  {pick.image_url && (
                                    <div className="relative w-full h-40">
                                      <img src={pick.image_url} alt="" className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
                                      <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                        <span className="text-[12px] font-bold text-white">{idx + 1}</span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="px-4 pb-3.5" style={{ paddingTop: pick.image_url ? 8 : 14 }}>
                                    {!pick.image_url && (
                                      <div className="flex items-center gap-2 mb-1.5">
                                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: color + '30' }}>
                                          <span className="text-[10px] font-bold" style={{ color }}>{idx + 1}</span>
                                        </div>
                                      </div>
                                    )}

                                    <div className="text-[17px] font-bold text-white tracking-[-0.3px] leading-tight">{pick.title}</div>

                                    {pick.location && !showGroupHeader && (
                                      <div className="text-[12px] text-text-faint mt-0.5 flex items-center gap-1">
                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                        {pick.location}
                                      </div>
                                    )}

                                    {pick.why && (
                                      <div className="text-[13px] text-text-secondary leading-[1.5] mt-2">{pick.why}</div>
                                    )}

                                    {(pick.links.length > 0 || pick.location) && (
                                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                                        {pick.links.map((link, i) => (
                                          <a key={i} href={link} target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] font-semibold text-accent px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20">
                                            {getLinkLabel(link)}
                                          </a>
                                        ))}
                                        {pick.links.length === 0 && pick.location && (
                                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([pick.title, pick.location].join(', '))}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="text-[10px] font-semibold text-accent px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 flex items-center gap-1">
                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                            Maps
                                          </a>
                                        )}
                                      </div>
                                    )}

                                    {/* Share + edit row */}
                                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/30">
                                      <button
                                        onClick={async () => {
                                          const url = pick.links[0] || (pick.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([pick.title, pick.location].join(', '))}` : window.location.href)
                                          const text = `${pick.title}${pick.location ? ` — ${pick.location}` : ''}${pick.why ? `\n\n${pick.why}` : ''}`
                                          if (navigator.share) {
                                            try { await navigator.share({ title: pick.title, text, url }); return } catch {}
                                          }
                                          await navigator.clipboard.writeText(`${text}\n${url}`)
                                          setMenuOpenId(`shared-${pick.id}`)
                                          setTimeout(() => setMenuOpenId(null), 2000)
                                        }}
                                        className="flex items-center gap-1 text-[11px] font-semibold text-text-faint"
                                      >
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                                        </svg>
                                        {menuOpenId === `shared-${pick.id}` ? 'Copied' : 'Share'}
                                      </button>
                                      <button onClick={() => setMenuOpenId(menuOpenId === pick.id ? null : pick.id)} className="text-text-faint p-0.5">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Edit/delete menu */}
                                  {menuOpenId === pick.id && (
                                    <>
                                      <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setMenuOpenId(null)} />
                                      <div className="fixed inset-x-0 bottom-0 z-[201] p-4 pb-8">
                                        <div className="bg-bg-elevated border border-border rounded-2xl overflow-hidden shadow-2xl max-w-[390px] mx-auto">
                                          <button onClick={() => startEdit(pick)} className="w-full text-left px-5 py-4 text-[14px] text-white font-semibold border-b border-border">Edit</button>
                                          <button onClick={() => handleRemovePick(pick.id)} className="w-full text-left px-5 py-4 text-[14px] text-red-400 font-semibold border-b border-border">Delete</button>
                                          <button onClick={() => setMenuOpenId(null)} className="w-full text-center px-5 py-3.5 text-[14px] font-semibold text-text-faint">Cancel</button>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {/* Inline edit */}
                                  {editingPick?.id === pick.id && (
                                    <div className="px-4 pb-4 pt-3 border-t border-border">
                                      <div className="flex flex-col gap-2.5">
                                        <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-3 text-[14px] text-white outline-none focus:border-accent font-sans" />
                                        <input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="City / Type / Genre" className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans" />
                                        <textarea value={editWhy} onChange={(e) => { setEditWhy(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }} placeholder="Why?" rows={2} className="w-full bg-bg-base border border-border rounded-xl px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none" />
                                        {editLinks.map((link, i) => (
                                          <div key={i} className="flex items-center gap-2">
                                            <input value={link} onChange={(e) => { const n = [...editLinks]; n[i] = e.target.value; setEditLinks(n) }} placeholder="Link" className="flex-1 bg-bg-base border border-border rounded-xl px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans" />
                                            {editLinks.length > 1 && <button onClick={() => setEditLinks(editLinks.filter((_, j) => j !== i))} className="text-text-faint"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>}
                                          </div>
                                        ))}
                                        <button onClick={() => setEditLinks([...editLinks, ''])} className="text-[11px] text-text-faint text-left">+ Add link</button>
                                        <div className="flex gap-2 mt-1">
                                          <button onClick={() => setEditingPick(null)} className="flex-1 py-2.5 border border-border rounded-xl text-[13px] font-semibold text-text-dim">Cancel</button>
                                          <button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()} className="flex-[2] py-2.5 rounded-xl bg-accent text-accent-fg text-[13px] font-bold disabled:opacity-40">{savingEdit ? 'Saving...' : 'Save'}</button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Add more + Lists */}
            {picks.length > 0 && (
              <Link href="/profile/top3"
                className="w-full flex items-center justify-center gap-2 py-3.5 mt-2 rounded-xl border border-dashed border-accent/40 text-accent text-[14px] font-semibold">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add to your TOP 03
              </Link>
            )}

            {/* ── LISTS ── */}
            <div className="mt-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[18px] font-bold text-white tracking-[-0.3px]">Lists</h2>
                <Link href="/profile/lists" className="text-[12px] font-semibold text-accent">
                  {lists.length > 0 ? 'See all' : '+ Import'}
                </Link>
              </div>

              {lists.length === 0 ? (
                <Link
                  href="/profile/lists"
                  className="flex items-center gap-3 p-4 bg-bg-card border border-border rounded-2xl"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-white">Import from Google Maps</div>
                    <div className="text-[12px] text-text-faint">Bring in your saved places with one link</div>
                  </div>
                </Link>
              ) : (
                <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
                  {lists.map(list => (
                    <Link
                      key={list.id}
                      href="/profile/lists"
                      className="flex-shrink-0 w-[200px] bg-bg-card border border-border rounded-2xl overflow-hidden"
                    >
                      {list.hero_image ? (
                        <div className="w-full h-24 relative">
                          <img src={list.hero_image} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
                        </div>
                      ) : (
                        <div className="w-full h-16 bg-[#1a1a1e] flex items-center justify-center">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                      )}
                      <div className="px-3 py-2.5">
                        <div className="text-[13px] font-bold text-white truncate">{list.title}</div>
                        <div className="text-[11px] text-text-faint">{list.item_count} places</div>
                      </div>
                    </Link>
                  ))}
                  {/* Add another list card */}
                  <Link
                    href="/profile/lists"
                    className="flex-shrink-0 w-[120px] bg-bg-card border border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-1.5 min-h-[120px]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span className="text-[11px] font-semibold text-accent">Import</span>
                  </Link>
                </div>
              )}
            </div>
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
        <div className="fixed inset-0 z-[150] flex items-end" onClick={() => setShowStinkers(false)}>
          <div className="fixed inset-0 bg-black/60" />
          <div className="relative w-full bg-bg-base rounded-t-[28px] px-6 pt-6 pb-10 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5" />
            <div className="text-[11px] font-semibold text-bad tracking-[1px] uppercase mb-1">💩 Your stinkers</div>
            <div className="text-[20px] font-bold text-white tracking-[-0.5px] leading-[1.2] mb-1">
              {stinkerRecos.length} {stinkerRecos.length === 1 ? 'stinker' : 'stinkers'}
            </div>
            <div className="text-[13px] text-text-muted leading-[1.5] mb-4">
              Recos you sent that scored 3 or below. Three in one category and you're sin-binned.
            </div>

            {stinkerRecos.length === 0 ? (
              <div className="text-[14px] text-text-faint text-center py-6">Clean record. No stinkers yet.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {stinkerRecos.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 bg-bg-card border border-border rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-white truncate">{s.title}</div>
                      <div className="text-[12px] text-text-faint mt-0.5">
                        {getCategoryLabel(s.category)} — sent to {s.recipient}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <span className="text-[16px] font-black" style={{ color: '#F56E6E' }}>{s.score}/10</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowStinkers(false)}
              className="w-full mt-5 py-4 rounded-btn bg-bg-card border border-border text-[15px] font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

function StatBox({ value, label, danger, onPress }: { value: string; label: string; danger?: boolean; onPress?: () => void }) {
  const isLong = value.length > 5
  return (
    <div
      className={`flex-1 bg-bg-card rounded-input p-2.5 text-center overflow-hidden ${onPress ? 'cursor-pointer active:opacity-70' : ''}`}
      onClick={onPress}
    >
      <div className={`${isLong ? 'text-[13px]' : 'text-[20px]'} font-bold truncate ${danger ? 'text-bad' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-text-faint mt-0.5 truncate">{label}</div>
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
