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
  const [profile, setProfile] = useState<ProfileStats | null>(null)
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [memberNumber, setMemberNumber] = useState<number | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [showStinkers, setShowStinkers] = useState(false)
  const [profileCopied, setProfileCopied] = useState(false)
  const [stinkerRecos, setStinkerRecos] = useState<{ title: string; category: string; score: number; recipient: string }[]>([])
  const [sinBinStatuses, setSinBinStatuses] = useState<Array<{ category: string; bad_count: number; recipient_name: string; offences: string[] }>>([])


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
          ? supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('type', 'reco_received').contains('payload', { subtype: 'forwarded' })
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
                <button
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/r/u/${profile.username}`); setProfileCopied(true); setTimeout(() => setProfileCopied(false), 2000) }}
                  className="flex items-center gap-1 text-[11px] text-accent mt-1"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  {profileCopied ? 'Link copied' : `givemeareco.com/r/u/${profile.username}`}
                </button>
              </div>
            </div>

            {/* Reco flow graphic */}
            {(() => {
              const sent = profile.recos_sent
              const received = profile.recos_received
              const completed = profile.recos_completed
              const stinkers = profile.stinkers_sent
              const max = Math.max(sent, received, 1)
              return (
                <div className="mb-4 bg-bg-base border border-border rounded-xl px-4 py-3.5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px]">Reco flow</span>
                    {profile.avg_completion_days > 0 && (
                      <span className="text-[11px] text-text-faint">Avg {profile.avg_completion_days}d to complete</span>
                    )}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <Link href="/profile/recos?filter=given">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-accent">Given</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-white">{sent}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </div>
                      <div className="h-2 bg-[#1a1a1e] rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${(sent / max) * 100}%` }} />
                      </div>
                    </Link>
                    <Link href="/profile/recos?filter=received">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-[#5BC4F5]">Received</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-white">{received}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </div>
                      <div className="h-2 bg-[#1a1a1e] rounded-full overflow-hidden">
                        <div className="h-full bg-[#5BC4F5] rounded-full transition-all" style={{ width: `${(received / max) * 100}%` }} />
                      </div>
                    </Link>
                    <Link href="/profile/recos?filter=completed">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-[#2DD4BF]">Completed</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-white">{completed}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </div>
                      <div className="h-2 bg-[#1a1a1e] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2DD4BF] rounded-full transition-all" style={{ width: `${(completed / max) * 100}%` }} />
                      </div>
                    </Link>
                    <button onClick={() => setShowStinkers(true)}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-semibold text-[#F56E6E]">💩 Stinkers</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-white">{stinkers}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </div>
                      <div className="h-2 bg-[#1a1a1e] rounded-full overflow-hidden">
                        <div className="h-full bg-[#F56E6E] rounded-full transition-all" style={{ width: `${(stinkers / max) * 100}%` }} />
                      </div>
                    </button>
                  </div>
                </div>
              )
            })()}

            {/* Stat grid */}
            <div className="flex gap-2.5 mb-2.5">
              <StatBox value={`${profile.hit_rate}%`} label="Hit rate" />
              <StatBox value={profile.avg_score} label="Avg score" />
            </div>
            <div className="flex gap-2.5 mb-2.5">
              <StatBox value={String(profile.times_forwarded)} label="Forwarded" />
              <StatBox value={`${profile.avg_completion_days}d`} label="Avg to complete" />
            </div>
            <div className="flex gap-2.5">
              <Link href="/friends" className="flex-1"><StatBox value={String(profile.friends_count)} label="Friends" /></Link>
              {profile.top_category && (
                <StatBox value={getCategoryLabel(profile.top_category)} label="Top category" />
              )}
            </div>
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

          {/* TOP 03 */}
          <div className="px-6 pt-5">
            {(() => {
              // Count picks per category
              const catCounts: Record<string, number> = {}
              for (const p of picks) { const k = p.category.toLowerCase().trim(); catCounts[k] = (catCounts[k] ?? 0) + 1 }
              const completedCategories = Object.values(catCounts).filter(c => c >= 3).length
              const hasAnyComplete = completedCategories > 0

              return (
                <>
                  <div className="flex items-baseline justify-between mb-1">
                    <h1 className="text-[20px] font-bold text-white tracking-[-0.4px]">TOP 03</h1>
                    {hasAnyComplete && <span className="text-[11px] text-accent font-semibold">{completedCategories} {completedCategories === 1 ? 'category' : 'categories'} complete</span>}
                  </div>
                  <div className="text-[13px] text-text-muted leading-[1.5] mb-4">
                    {!hasAnyComplete
                      ? 'Pick a category and add your top 3. Complete at least one category to unlock sending recos.'
                      : 'Your top 3 in each category. The ones you think everyone should try.'
                    }
                  </div>
                </>
              )
            })()}

            {/* Add CTA */}
            <Link
              href="/profile/top3"
              className="w-full flex items-center justify-center gap-2 py-3.5 mb-4 rounded-btn border border-dashed border-accent/40 text-accent text-[14px] font-semibold hover:border-accent hover:bg-accent/5 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add to your TOP 03
            </Link>

            {/* Picks list */}
            {picks.length === 0 ? (
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
                        <span className={`text-[11px] font-semibold ${items.length >= 3 ? 'text-accent' : 'text-text-faint'}`}>{items.length}/3</span>
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
          <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans" />
          {pick.category === 'restaurant' && (
            <input value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="City" className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans" />
          )}
          <textarea value={editWhy} onChange={(e) => { setEditWhy(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }} placeholder="Why? (optional)" rows={1} className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[44px]" />
          {editLinks.map((link, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={link} onChange={(e) => { const n = [...editLinks]; n[i] = e.target.value; setEditLinks(n) }} placeholder="Link (optional)" className="flex-1 bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans" />
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
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {pick.links.map((link, i) => (
                <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent underline underline-offset-2">{getLinkLabel(link)}</a>
              ))}
              {/* Auto-generate Google Maps link for venue picks without links */}
              {pick.links.length === 0 && pick.location && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([pick.title, pick.location].join(', '))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-accent underline underline-offset-2"
                >
                  Google Maps
                </a>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <button onClick={() => setMenuOpenId(menuOpenId === pick.id ? null : pick.id)} className="text-text-faint hover:text-white transition-colors p-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
            </button>
            {menuOpenId === pick.id && (
              <>
                <div className="fixed inset-0 z-[120] bg-black/20 backdrop-blur-sm" onClick={() => setMenuOpenId(null)} />
                <div className="fixed inset-x-0 bottom-0 z-[121] p-4 pb-8">
                  <div className="bg-bg-elevated border border-border rounded-2xl overflow-hidden shadow-2xl max-w-[390px] mx-auto">
                    <button onClick={() => onEdit(pick)} className="w-full text-left px-5 py-4 text-[14px] text-white hover:bg-bg-card transition-colors border-b border-border font-semibold">Edit</button>
                    <button onClick={() => onDelete(pick.id)} className="w-full text-left px-5 py-4 text-[14px] text-red-400 hover:bg-bg-card transition-colors border-b border-border font-semibold">Delete</button>
                    <button onClick={() => setMenuOpenId(null)} className="w-full text-center px-5 py-3.5 text-[14px] font-semibold text-text-faint">Cancel</button>
                  </div>
                </div>
              </>
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
