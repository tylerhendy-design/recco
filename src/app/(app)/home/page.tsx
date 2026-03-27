'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { RecoCard } from '@/components/ui/RecoCard'
import { FeedbackSheet } from '@/components/overlays/FeedbackSheet'
import { SuccessOverlay } from '@/components/overlays/SuccessOverlay'
import { MapSheet } from '@/components/overlays/MapSheet'
import { ManualAddSheet } from '@/components/overlays/ManualAddSheet'
import { SentimentBadge } from '@/components/ui/SentimentBadge'
import { useRecos } from '@/lib/context/RecosContext'
import { createClient } from '@/lib/supabase/client'
import { fetchHomeFeed, fetchDoneRecos, submitFeedback } from '@/lib/data/recos'
import { initials } from '@/lib/utils'
import { getCategoryLabel, getCategoryColor } from '@/constants/categories'
import type { Reco, RecoRecommender } from '@/types/app.types'

type Tab = 'todo' | 'done'

const CATEGORY_FILTERS = [
  { value: 'all', label: 'all' },
  { value: 'restaurant', label: 'restaurants' },
  { value: 'tv', label: 'TV series' },
  { value: 'podcast', label: 'podcasts' },
  { value: 'music', label: 'music' },
  { value: 'book', label: 'books' },
  { value: 'film', label: 'films' },
]

const TIME_FILTERS = [
  { value: 'all', label: 'all time' },
  { value: 'week', label: 'this week' },
  { value: 'month', label: 'this month' },
  { value: 'year', label: 'this year' },
]

// Merge recos with same title+category into one card with multiple recommenders
function groupRecos(recos: Reco[]): Reco[] {
  const map = new Map<string, Reco>()
  for (const reco of recos) {
    const key = `${reco.category}::${reco.title.toLowerCase().trim()}`
    if (map.has(key)) {
      const existing = map.get(key)!
      const newRec: RecoRecommender = {
        profile: reco.sender,
        why_text: reco.why_text,
        tier: 'clan',
      }
      existing.recommenders = [...(existing.recommenders ?? []), newRec]
    } else {
      map.set(key, { ...reco })
    }
  }
  return Array.from(map.values())
}

export default function HomePage() {
  const { manualRecos } = useRecos()
  const supabase = createClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('there')
  const [userInitials, setUserInitials] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [dbRecos, setDbRecos] = useState<Reco[]>([])
  const [doneRecos, setDoneRecos] = useState<Reco[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDone, setLoadingDone] = useState(false)

  const [tab, setTab] = useState<Tab>('todo')
  const [catFilter, setCatFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [senderFilter, setSenderFilter] = useState('all')
  const [catDDOpen, setCatDDOpen] = useState(false)
  const [timeDDOpen, setTimeDDOpen] = useState(false)
  const [senderDDOpen, setSenderDDOpen] = useState(false)

  const [doneExpanded, setDoneExpanded] = useState<Record<string, boolean>>({})
  const [feedbackReco, setFeedbackReco] = useState<Reco | null>(null)
  const [successState, setSuccessState] = useState<{ reco: Reco; score: number } | null>(null)
  const [mapReco, setMapReco] = useState<Reco | null>(null)
  const [manualAddOpen, setManualAddOpen] = useState(false)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  const loadFeed = useCallback(async (uid: string) => {
    const recos = await fetchHomeFeed(uid)
    setDbRecos(recos)
    setLoading(false)
  }, [])

  const loadDone = useCallback(async (uid: string) => {
    setLoadingDone(true)
    const recos = await fetchDoneRecos(uid)
    setDoneRecos(recos)
    setLoadingDone(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', user.id)
        .single()
      if (profile?.display_name) {
        setFirstName(profile.display_name.split(' ')[0])
        setUserInitials(initials(profile.display_name))
      }
      if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
      loadFeed(user.id)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('home-feed')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'reco_recipients',
        filter: `recipient_id=eq.${userId}`,
      }, () => loadFeed(userId))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, loadFeed])

  useEffect(() => {
    if (tab === 'done' && userId && doneRecos.length === 0) {
      loadDone(userId)
    }
  }, [tab, userId])

  // Group duplicates into single cards
  const grouped = useMemo(
    () => groupRecos([...manualRecos, ...dbRecos].filter((r) => !doneIds.has(r.id))),
    [manualRecos, dbRecos, doneIds]
  )

  // Derive sender options from grouped recos
  const senderOptions = useMemo(() => {
    const seen = new Map<string, string>()
    for (const reco of grouped) {
      for (const rec of reco.recommenders ?? []) {
        seen.set(rec.profile.id, rec.profile.display_name.split(' ')[0])
      }
    }
    return [
      { value: 'all', label: 'everyone' },
      ...Array.from(seen.entries()).map(([id, name]) => ({ value: id, label: name })),
    ]
  }, [grouped])

  const filtered = useMemo(() => {
    return grouped
      .filter((r) => catFilter === 'all' || r.category === catFilter)
      .filter((r) => {
        if (timeFilter === 'all') return true
        const ms = Date.now() - new Date(r.created_at).getTime()
        if (timeFilter === 'week') return ms < 7 * 86400000
        if (timeFilter === 'month') return ms < 30 * 86400000
        if (timeFilter === 'year') return ms < 365 * 86400000
        return true
      })
      .filter((r) =>
        senderFilter === 'all' ||
        r.recommenders?.some((rec) => rec.profile.id === senderFilter)
      )
  }, [grouped, catFilter, timeFilter, senderFilter])

  const doneByCategory = useMemo(() =>
    doneRecos.reduce<Record<string, Reco[]>>((acc, r) => {
      if (!acc[r.category]) acc[r.category] = []
      acc[r.category].push(r)
      return acc
    }, {}),
    [doneRecos]
  )

  function closeAllDD() {
    setCatDDOpen(false)
    setTimeDDOpen(false)
    setSenderDDOpen(false)
  }

  async function handleFeedbackSubmit(score: number, text: string) {
    if (!feedbackReco || !userId) return
    const reco = feedbackReco
    setDoneIds((prev) => new Set(prev).add(reco.id))
    setFeedbackReco(null)
    setSuccessState({ reco, score })
    await submitFeedback({
      recoId: reco.id,
      recipientId: userId,
      senderId: reco.sender_id,
      score,
      feedbackText: text,
      recoTitle: reco.title,
    })
    if (doneRecos.length > 0) loadDone(userId)
  }

  const catLabel = CATEGORY_FILTERS.find((f) => f.value === catFilter)?.label ?? 'all'
  const timeLabel = TIME_FILTERS.find((f) => f.value === timeFilter)?.label ?? 'all time'
  const senderLabel = senderOptions.find((f) => f.value === senderFilter)?.label ?? 'everyone'

  return (
    <div className="flex flex-col flex-1 relative overflow-hidden">
      <StatusBar />

      {/* Nav */}
      <div className="flex justify-between items-center px-6 pt-5 pb-2.5 flex-shrink-0">
        <Link href="/profile" className="w-8 h-8 rounded-full bg-[#1e1c04] border border-accent flex items-center justify-center overflow-hidden flex-shrink-0">
          {avatarUrl
            ? <img src={avatarUrl} alt="profile" className="w-full h-full object-cover" />
            : <span className="text-[11px] font-bold text-accent">{userInitials}</span>
          }
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => setManualAddOpen(true)} aria-label="Add reco manually">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="4" rx="1"/>
              <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          <Link href="/notifications" className="relative">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <div className="absolute -top-[3px] -right-[3px] w-2 h-2 rounded-full bg-accent" />
          </Link>
        </div>
      </div>

      {/* Greeting + filters */}
      <div className="px-6 pt-3 pb-4 flex-shrink-0" onClick={closeAllDD}>
        <div className="text-[26px] font-semibold text-white leading-[1.25] tracking-[-0.6px] mb-3">
          Hey {firstName},
        </div>

        {/* Three-filter line */}
        <div className="text-[15px] text-text-muted leading-[1.7]" onClick={(e) => e.stopPropagation()}>
          Here are{' '}
          {/* Category */}
          <span className="relative inline-block">
            <span
              className="text-accent border-b border-accent cursor-pointer"
              onClick={() => { setCatDDOpen((o) => !o); setTimeDDOpen(false); setSenderDDOpen(false) }}
            >
              {catLabel}
            </span>
            {catDDOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-bg-elevated border border-border rounded-input z-50 min-w-[160px] overflow-hidden shadow-lg">
                {CATEGORY_FILTERS.map((f) => (
                  <div
                    key={f.value}
                    onClick={() => { setCatFilter(f.value); setCatDDOpen(false) }}
                    className={`px-4 py-2.5 text-[13px] cursor-pointer hover:bg-bg-card ${catFilter === f.value ? 'text-accent' : 'text-text-secondary'}`}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            )}
          </span>
          {' '}recos from{' '}
          {/* Time */}
          <span className="relative inline-block">
            <span
              className="text-accent border-b border-accent cursor-pointer"
              onClick={() => { setTimeDDOpen((o) => !o); setCatDDOpen(false); setSenderDDOpen(false) }}
            >
              {timeLabel}
            </span>
            {timeDDOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-bg-elevated border border-border rounded-input z-50 min-w-[160px] overflow-hidden shadow-lg">
                {TIME_FILTERS.map((f) => (
                  <div
                    key={f.value}
                    onClick={() => { setTimeFilter(f.value); setTimeDDOpen(false) }}
                    className={`px-4 py-2.5 text-[13px] cursor-pointer hover:bg-bg-card ${timeFilter === f.value ? 'text-accent' : 'text-text-secondary'}`}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            )}
          </span>
          {' '}sent by{' '}
          {/* Sender */}
          <span className="relative inline-block">
            <span
              className="text-accent border-b border-accent cursor-pointer"
              onClick={() => { setSenderDDOpen((o) => !o); setCatDDOpen(false); setTimeDDOpen(false) }}
            >
              {senderLabel}
            </span>
            {senderDDOpen && (
              <div className="absolute top-full left-0 mt-1.5 bg-bg-elevated border border-border rounded-input z-50 min-w-[160px] overflow-hidden shadow-lg">
                {senderOptions.map((f) => (
                  <div
                    key={f.value}
                    onClick={() => { setSenderFilter(f.value); setSenderDDOpen(false) }}
                    className={`px-4 py-2.5 text-[13px] cursor-pointer hover:bg-bg-card ${senderFilter === f.value ? 'text-accent' : 'text-text-secondary'}`}
                  >
                    {f.label}
                  </div>
                ))}
              </div>
            )}
          </span>
        </div>

        {/* To do / Done toggle */}
        <div className="flex items-center gap-1 bg-bg-card rounded-input p-1 w-fit mt-4">
          <button
            onClick={() => setTab('todo')}
            className={`px-4 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all ${
              tab === 'todo' ? 'bg-bg-elevated text-white shadow-sm' : 'text-text-faint hover:text-text-muted'
            }`}
          >
            To do{grouped.length > 0 ? ` · ${grouped.length}` : ''}
          </button>
          <button
            onClick={() => setTab('done')}
            className={`px-4 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all ${
              tab === 'done' ? 'bg-bg-elevated text-white shadow-sm' : 'text-text-faint hover:text-text-muted'
            }`}
          >
            Done{doneRecos.length > 0 ? ` · ${doneRecos.length}` : ''}
          </button>
        </div>
      </div>

      {/* ── TO DO TAB ── */}
      {tab === 'todo' && (
        <div className="flex-1 overflow-y-auto scrollbar-none px-5 flex flex-col gap-3 pb-6" onClick={closeAllDD}>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {!loading && filtered.map((reco, i) => (
            <RecoCard
              key={reco.id}
              reco={reco}
              rank={i + 1}
              onMarkDone={setFeedbackReco}
              onShowMap={setMapReco}
            />
          ))}

          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-10">
              <div className="text-[40px] mb-2">🎯</div>
              <div className="text-[17px] font-semibold text-white">No recos yet</div>
              <div className="text-[14px] text-text-muted leading-[1.6]">
                When friends give you recos they'll appear here.
              </div>
              <Link href="/get" className="mt-2 text-accent text-sm font-semibold">
                Ask for a reco →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── DONE TAB ── */}
      {tab === 'done' && (
        <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
          {loadingDone && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {!loadingDone && doneRecos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-10">
              <div className="text-[36px] mb-2">✓</div>
              <div className="text-[17px] font-semibold text-white">Nothing completed yet</div>
              <div className="text-[14px] text-text-muted leading-[1.6]">
                Recos you've marked as done will appear here.
              </div>
            </div>
          )}

          {!loadingDone && Object.entries(doneByCategory).map(([category, recos]) => {
            const isOpen = doneExpanded[category] ?? true
            const color = getCategoryColor(category)
            return (
              <div key={category} className="border-b border-[#0e0e10]">
                <button
                  onClick={() => setDoneExpanded((prev) => ({ ...prev, [category]: !isOpen }))}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-card/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="text-[15px] font-semibold text-white tracking-[-0.3px]">
                      {getCategoryLabel(category)}
                    </span>
                    <span className="text-[12px] text-text-faint">{recos.length}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="2.5" strokeLinecap="round"
                    className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>

                {isOpen && recos.map((reco) => (
                  <div key={reco.id} className="flex items-center justify-between px-6 py-3 border-t border-[#0e0e10]">
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-[14px] font-medium text-text-secondary truncate">{reco.title}</div>
                      <div className="text-[11px] text-text-faint mt-0.5">
                        from {reco.sender.display_name.split(' ')[0]}
                        {reco.rated_at ? ` · ${new Date(reco.rated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                      </div>
                    </div>
                    {reco.score != null && <SentimentBadge score={reco.score} />}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <FeedbackSheet
        open={!!feedbackReco}
        onClose={() => setFeedbackReco(null)}
        onSubmit={handleFeedbackSubmit}
        recoTitle={feedbackReco?.title ?? ''}
        recoCategory={feedbackReco ? feedbackReco.category : ''}
      />

      {successState && (
        <SuccessOverlay
          open={!!successState}
          onClose={() => setSuccessState(null)}
          score={successState.score}
          recoTitle={successState.reco.title}
        />
      )}

      <MapSheet
        open={!!mapReco}
        onClose={() => setMapReco(null)}
        name={mapReco?.title ?? ''}
        address={mapReco?.meta?.location}
      />

      <ManualAddSheet open={manualAddOpen} onClose={() => setManualAddOpen(false)} />
    </div>
  )
}
