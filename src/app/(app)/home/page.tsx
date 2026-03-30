'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { RecoCard } from '@/components/ui/RecoCard'
import { FeedbackSheet } from '@/components/overlays/FeedbackSheet'
import { BeenThereSheet } from '@/components/overlays/BeenThereSheet'
import { NoGoSheet } from '@/components/overlays/NoGoSheet'
import { SuccessOverlay } from '@/components/overlays/SuccessOverlay'
import { SinBinModal } from '@/components/overlays/SinBinModal'
import { MapSheet } from '@/components/overlays/MapSheet'
import { SentimentBadge } from '@/components/ui/SentimentBadge'
import { useRecos } from '@/lib/context/RecosContext'
import { createClient } from '@/lib/supabase/client'
import { fetchHomeFeed, fetchDoneRecos, fetchNoGoRecos, submitFeedback, markBeenThere, markNoGo, requestNewReco } from '@/lib/data/recos'
import { initials } from '@/lib/utils'
import { getCategoryLabel, getCategoryColor } from '@/constants/categories'
import type { Reco, RecoRecommender } from '@/types/app.types'

type Tab = 'todo' | 'done' | 'nogo'

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
  { value: 'today', label: 'today' },
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
  return <Suspense><HomePageInner /></Suspense>
}

function HomePageInner() {
  const { manualRecos } = useRecos()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const openRecoId = searchParams.get('reco')
  const previewMode = searchParams.get('preview')

  const [userId, setUserId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('there')
  const [userInitials, setUserInitials] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [friendCount, setFriendCount] = useState<number | null>(null)
  const [dbRecos, setDbRecos] = useState<Reco[]>([])
  const [doneRecos, setDoneRecos] = useState<Reco[]>([])
  const [noGoRecos, setNoGoRecos] = useState<Reco[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingDone, setLoadingDone] = useState(false)
  const [loadingNoGo, setLoadingNoGo] = useState(false)
  const [dbNoGoRecos, setDbNoGoRecos] = useState<Reco[]>([])

  const [tab, setTab] = useState<Tab>('todo')
  const [tabDDOpen, setTabDDOpen] = useState(false)
  const TAB_LABELS: Record<Tab, string> = { todo: 'To Do', done: 'Done', nogo: 'No Gos' }
  const TAB_ORDER: Tab[] = ['todo', 'done', 'nogo']
  type ViewMode = 'full' | 'compact' | 'list'
  const VIEW_LABELS: Record<ViewMode, string> = { full: 'Full', compact: 'Compact', list: 'List' }
  const VIEW_CYCLE: ViewMode[] = ['full', 'compact', 'list']
  const [viewMode, setViewMode] = useState<ViewMode>('full')
  const [catFilter, setCatFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState('all')
  const [senderFilter, setSenderFilter] = useState('all')
  const [catDDOpen, setCatDDOpen] = useState(false)
  const [timeDDOpen, setTimeDDOpen] = useState(false)
  const [senderDDOpen, setSenderDDOpen] = useState(false)

  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollY = useRef(0)
  const collapseRef = useRef<HTMLDivElement>(null)
  const [collapseHeight, setCollapseHeight] = useState(0)

  useEffect(() => {
    if (collapseRef.current) {
      setCollapseHeight(collapseRef.current.scrollHeight)
    }
  }, [firstName])

  function handleFeedScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    const currentY = el.scrollTop
    const delta = currentY - lastScrollY.current

    // Near the top — always show
    if (currentY < 30) {
      if (!headerVisible) setHeaderVisible(true)
    }
    // Scrolling down significantly — hide
    else if (delta > 15 && headerVisible) {
      setHeaderVisible(false)
      closeAllDD()
      // Reset lastScrollY to current position to avoid stale delta on next scroll
      lastScrollY.current = currentY
      return
    }
    // Scrolling up significantly — show
    else if (delta < -10 && !headerVisible) {
      setHeaderVisible(true)
      lastScrollY.current = currentY
      return
    }

    lastScrollY.current = currentY
  }

  const [doneExpanded, setDoneExpanded] = useState<Record<string, boolean>>({})
  const [feedbackReco, setFeedbackReco] = useState<Reco | null>(null)
  const [successState, setSuccessState] = useState<{ reco: Reco; score: number; sinBinWarning?: { category: string; remaining: number } } | null>(null)
  const [sinBinData, setSinBinData] = useState<{ senderId: string; senderName: string; category: string; offences: string[] } | null>(null)
  const [mapReco, setMapReco] = useState<Reco | null>(null)
  const [beenThereReco, setBeenThereReco] = useState<Reco | null>(null)
  const [noGoReco, setNoGoReco] = useState<Reco | null>(null)
  const [noGoSuccess, setNoGoSuccess] = useState<{ senderName: string } | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [unreadCount, setUnreadCount] = useState(0)

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

  const loadNoGo = useCallback(async (uid: string) => {
    setLoadingNoGo(true)
    const recos = await fetchNoGoRecos(uid)
    setDbNoGoRecos(recos)
    setLoadingNoGo(false)
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

      // Friend count
      const { count: fc } = await supabase
        .from('friend_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
      setFriendCount(fc ?? 0)

      loadFeed(user.id)
      loadDone(user.id)
      loadNoGo(user.id)

      // Unread notification count
      const fetchUnread = async () => {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('read', false)
        setUnreadCount(count ?? 0)
      }
      fetchUnread()

      // Live updates for new notifications
      supabase
        .channel('unread-notifs')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        }, fetchUnread)
        .subscribe()
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
    if (tab === 'nogo' && userId && dbNoGoRecos.length === 0) {
      loadNoGo(userId)
    }
  }, [tab, userId])

  // Split feed into todo and no-go
  const grouped = useMemo(
    () => groupRecos([...manualRecos, ...dbRecos].filter((r) => !doneIds.has(r.id) && r.status !== 'no_go')),
    [manualRecos, dbRecos, doneIds]
  )

  const noGoList = useMemo(
    () => [...noGoRecos, ...dbNoGoRecos].filter(
      (r, i, self) => self.findIndex((x) => x.id === r.id) === i
    ),
    [noGoRecos, dbNoGoRecos]
  )

  // Derive sender options from grouped recos
  const senderOptions = useMemo(() => {
    const seen = new Map<string, { label: string; sub: string }>()
    for (const reco of grouped) {
      for (const rec of reco.recommenders ?? []) {
        seen.set(rec.profile.id, {
          label: rec.profile.display_name.split(' ')[0],
          sub: `@${rec.profile.username}`,
        })
      }
    }
    return [
      { value: 'all', label: 'everyone', sub: '' },
      ...Array.from(seen.entries()).map(([id, { label, sub }]) => ({ value: id, label, sub })),
    ]
  }, [grouped])

  const filtered = useMemo(() => {
    return grouped
      .filter((r) => catFilter === 'all' || r.category === catFilter)
      .filter((r) => {
        if (timeFilter === 'all') return true
        const ms = Date.now() - new Date(r.created_at).getTime()
        if (timeFilter === 'today') return ms < 86400000
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

  function handleForward(reco: Reco) {
    const params = new URLSearchParams({
      forward: 'true',
      category: reco.category,
      title: reco.title,
    })
    if (reco.meta?.artwork_url) params.set('image', reco.meta.artwork_url)
    if (reco.why_text) params.set('why', reco.why_text)
    if (reco.sender?.display_name) params.set('from', reco.sender.display_name.split(' ')[0])
    if (reco.sender?.id) params.set('originalSenderId', reco.sender.id)
    router.push(`/send?${params.toString()}`)
  }

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
    const result = await submitFeedback({
      recoId: reco.id,
      recipientId: userId,
      senderId: reco.sender_id,
      score,
      feedbackText: text,
      recoTitle: reco.title,
      recoCategory: reco.category,
    })
    if (result.sinBinTriggered) {
      setSinBinData({
        senderId: reco.sender_id,
        senderName: reco.sender.display_name,
        category: result.sinBinTriggered.category,
        offences: result.sinBinTriggered.offences,
      })
    } else if (result.sinBinWarning) {
      setSuccessState({ reco, score, sinBinWarning: result.sinBinWarning })
    }
    if (doneRecos.length > 0) loadDone(userId)
  }

  async function handleBeenThereRate() {
    if (!beenThereReco || !userId) return
    const reco = beenThereReco
    await markBeenThere(reco.id, userId, reco.sender_id, reco.title)
    setBeenThereReco(null)
    setFeedbackReco(reco)
  }

  async function handleBeenThereRequestNew() {
    if (!beenThereReco || !userId) return
    const reco = beenThereReco
    setBeenThereReco(null)
    setDoneIds((prev) => new Set(prev).add(reco.id))
    await markBeenThere(reco.id, userId, reco.sender_id, reco.title)
    await requestNewReco(userId, reco.sender_id, reco.title, reco.category)
  }

  async function handleNoGoSubmit(reason: string) {
    if (!noGoReco || !userId) return
    const reco = noGoReco
    setNoGoReco(null)
    setDoneIds((prev) => new Set(prev).add(reco.id))
    setNoGoRecos((prev) => [...prev, { ...reco, status: 'no_go' as const, feedback_text: reason }])
    setNoGoSuccess({ senderName: reco.sender.display_name.split(' ')[0] })
    await markNoGo(reco.id, userId, reco.sender_id, reason, reco.title)
  }

  const catLabel = CATEGORY_FILTERS.find((f) => f.value === catFilter)?.label ?? 'all'
  const timeLabel = TIME_FILTERS.find((f) => f.value === timeFilter)?.label ?? 'all time'
  const senderOption = senderOptions.find((f) => f.value === senderFilter)
  const senderLabel = senderOption
    ? senderOption.sub ? `${senderOption.label} ${senderOption.sub}` : senderOption.label
    : 'everyone'

  return (
    <div className="flex flex-col flex-1 relative overflow-hidden">
      <StatusBar />

      {/* Nav */}
      <div className="flex justify-between items-center px-6 pt-5 pb-2.5 flex-shrink-0 relative" style={{ zIndex: tabDDOpen ? 111 : 30 }}>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="w-8 h-8 rounded-full bg-[#1e1c04] border border-accent flex items-center justify-center overflow-hidden flex-shrink-0">
            {avatarUrl
              ? <img src={avatarUrl} alt="profile" className="w-full h-full object-cover" />
              : <span className="text-[11px] font-bold text-accent">{userInitials}</span>
            }
          </Link>
          <div className="relative" style={{ zIndex: tabDDOpen ? 1001 : 'auto' }}>
            <button onClick={() => setTabDDOpen(o => !o)} className="flex items-baseline gap-2">
              <h1 className="text-[26px] font-bold text-white tracking-[-0.6px]">
                {TAB_LABELS[tab]}
              </h1>
              {(() => {
                const count = tab === 'todo' ? grouped.length : tab === 'done' ? doneRecos.length : noGoList.length
                return count > 0 ? <span className="text-[14px] font-semibold text-text-faint">{count}</span> : null
              })()}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="3" strokeLinecap="round" className="ml-0.5">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            {tabDDOpen && (
              <div className="absolute top-full left-0 mt-2 bg-bg-elevated border border-border rounded-xl overflow-hidden shadow-2xl min-w-[180px]">
                {TAB_ORDER.map((t) => {
                  const count = t === 'todo' ? grouped.length : t === 'done' ? doneRecos.length : noGoList.length
                  const active = tab === t
                  return (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setTabDDOpen(false); setHeaderVisible(true) }}
                      className={`w-full flex items-center justify-between px-4 py-3 text-[14px] border-b border-[#1a1a1e] transition-colors ${active ? 'text-accent font-bold' : 'text-text-secondary font-semibold'}`}
                    >
                      {TAB_LABELS[t]}
                      {count > 0 && <span className={`text-[12px] ${active ? 'text-accent/70' : 'text-text-faint'}`}>{count}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(VIEW_CYCLE[(VIEW_CYCLE.indexOf(viewMode) + 1) % VIEW_CYCLE.length])}
            className="flex items-center justify-center w-9 h-9 text-text-faint hover:text-white transition-colors"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <Link href="/send/manual" aria-label="Add reco manually" className="flex items-center justify-center w-9 h-9">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="4" rx="1"/>
              <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </Link>
          <Link href="/notifications" className="relative flex items-center justify-center w-9 h-9" onClick={() => setUnreadCount(0)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && <div className="absolute top-[5px] right-[5px] w-2 h-2 rounded-full bg-accent" />}
          </Link>
        </div>
      </div>

      {/* Greeting + filters — only on To Do tab, collapses on scroll */}
      <div
        style={{
          height: tab !== 'todo' ? 0 : headerVisible ? collapseHeight || 'auto' : 0,
          opacity: tab !== 'todo' ? 0 : headerVisible ? 1 : 0,
          overflow: (catDDOpen || timeDDOpen || senderDDOpen) ? 'visible' : 'hidden',
          transition: 'height 200ms ease, opacity 150ms ease',
          pointerEvents: tab === 'todo' && headerVisible ? 'auto' : 'none',
          flexShrink: 0,
          position: 'relative',
          zIndex: (catDDOpen || timeDDOpen || senderDDOpen) ? 112 : 30,
        }}
        onClick={closeAllDD}
      >
        <div ref={collapseRef} className="px-6 pt-3 pb-4">
          {/* Three-filter line — tappable words with inline dropdowns */}
          <div className="text-[22px] font-semibold text-text-muted leading-[1.3] tracking-[-0.5px]" onClick={(e) => e.stopPropagation()}>
            Here are{' '}
            <span className="relative inline-block" style={{ zIndex: catDDOpen ? 111 : 'auto' }}>
              <span className="text-accent border-b border-accent cursor-pointer" onClick={() => { setCatDDOpen(o => !o); setTimeDDOpen(false); setSenderDDOpen(false) }}>{catLabel}</span>
              {catDDOpen && (
                <div className="absolute top-full left-0 mt-2 bg-bg-elevated border border-border rounded-xl overflow-hidden shadow-2xl min-w-[180px]">
                  {CATEGORY_FILTERS.map((f) => (
                    <button key={f.value} onClick={() => { setCatFilter(f.value); setCatDDOpen(false) }} className={`w-full text-left px-4 py-3 text-[14px] border-b border-[#1a1a1e] transition-colors ${catFilter === f.value ? 'text-accent font-semibold' : 'text-text-secondary'}`}>{f.label}</button>
                  ))}
                  {catFilter !== 'all' && <button onClick={() => { setCatFilter('all'); setCatDDOpen(false) }} className="w-full text-left px-4 py-3 text-[13px] text-text-faint border-t border-border">Clear filter</button>}
                </div>
              )}
            </span>
            {' '}recos from{' '}
            <span className="relative inline-block" style={{ zIndex: timeDDOpen ? 111 : 'auto' }}>
              <span className="text-accent border-b border-accent cursor-pointer" onClick={() => { setTimeDDOpen(o => !o); setCatDDOpen(false); setSenderDDOpen(false) }}>{timeLabel}</span>
              {timeDDOpen && (
                <div className="absolute top-full left-0 mt-2 bg-bg-elevated border border-border rounded-xl overflow-hidden shadow-2xl min-w-[160px]">
                  {TIME_FILTERS.map((f) => (
                    <button key={f.value} onClick={() => { setTimeFilter(f.value); setTimeDDOpen(false) }} className={`w-full text-left px-4 py-3 text-[14px] border-b border-[#1a1a1e] transition-colors ${timeFilter === f.value ? 'text-accent font-semibold' : 'text-text-secondary'}`}>{f.label}</button>
                  ))}
                  {timeFilter !== 'all' && <button onClick={() => { setTimeFilter('all'); setTimeDDOpen(false) }} className="w-full text-left px-4 py-3 text-[13px] text-text-faint border-t border-border">Clear filter</button>}
                </div>
              )}
            </span>
            {' '}sent by{' '}
            <span className="relative inline-block" style={{ zIndex: senderDDOpen ? 111 : 'auto' }}>
              <span className="text-accent border-b border-accent cursor-pointer" onClick={() => { setSenderDDOpen(o => !o); setCatDDOpen(false); setTimeDDOpen(false) }}>{senderLabel}</span>
              {senderDDOpen && (
                <div className="absolute top-full left-0 mt-2 bg-bg-elevated border border-border rounded-xl overflow-hidden shadow-2xl min-w-[200px] max-h-[50vh] overflow-y-auto">
                  {senderOptions.map((f) => (
                    <button key={f.value} onClick={() => { setSenderFilter(f.value); setSenderDDOpen(false) }} className={`w-full text-left px-4 py-3 border-b border-[#1a1a1e] transition-colors ${senderFilter === f.value ? 'text-accent font-semibold' : 'text-text-secondary'}`}>
                      <div className="text-[14px]">{f.label}</div>
                      {f.sub && <div className="text-[11px] text-text-faint mt-0.5">{f.sub}</div>}
                    </button>
                  ))}
                  {senderFilter !== 'all' && <button onClick={() => { setSenderFilter('all'); setSenderDDOpen(false) }} className="w-full text-left px-4 py-3 text-[13px] text-text-faint border-t border-border">Clear filter</button>}
                </div>
              )}
            </span>
          </div>
          {(catFilter !== 'all' || timeFilter !== 'all' || senderFilter !== 'all') && (
            <button
              onClick={() => { setCatFilter('all'); setTimeFilter('all'); setSenderFilter('all') }}
              className="mt-2 text-[12px] text-text-faint underline underline-offset-2 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>


      {/* ── TO DO TAB ── */}
      {tab === 'todo' && (
        <div className="flex-1 overflow-y-auto scrollbar-none" onScroll={handleFeedScroll}>
          <div className="px-5 pb-6" onClick={closeAllDD}>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {!loading && previewMode !== 'nofriends' && filtered.map((reco, i) => (
            <div key={reco.id} className="mb-3">
            <RecoCard
              reco={reco}
              rank={i + 1}
              viewMode={viewMode}
              initialOpen={openRecoId === reco.id}
              onMarkDone={setFeedbackReco}
              onBeenThere={setBeenThereReco}
              onNoGo={setNoGoReco}
            />
            </div>
          ))}

          {!loading && (filtered.length === 0 || previewMode === 'nofriends') && (friendCount === 0 || previewMode === 'nofriends') && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-8">
              <div className="text-[40px] mb-1">👋</div>
              <div className="text-[20px] font-bold text-white tracking-[-0.5px]">Add your friends first</div>
              <div className="text-[14px] text-text-muted leading-[1.6]">
                Recos come from people you trust. Add friends to start giving and getting recommendations.
              </div>
              <Link href="/friends/add" className="mt-3 w-full py-3.5 bg-accent text-accent-fg rounded-btn text-[15px] font-bold text-center">
                Find friends
              </Link>
              <Link href="/friends/add" className="text-text-faint text-[13px]">
                Search by username or share your invite link
              </Link>
            </div>
          )}

          {!loading && filtered.length === 0 && friendCount !== 0 && (
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
        </div>
      )}

      {/* ── DONE TAB ── */}
      {tab === 'done' && (
        <div className="flex-1 overflow-y-auto scrollbar-none pb-6" onScroll={handleFeedScroll}>
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
            const isOpen = doneExpanded[category] ?? false
            const color = getCategoryColor(category)
            return (
              <div key={category} className="border-b border-[#1a1a1e]">
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

                {isOpen && (
                  <div className="px-4 pb-3 flex flex-col gap-3">
                    {recos.map((reco) => (
                      <RecoCard key={reco.id} reco={reco} viewMode={viewMode} onForward={handleForward} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── NO GOS TAB ── */}
      {tab === 'nogo' && (
        <div className="flex-1 overflow-y-auto scrollbar-none pb-6" onScroll={handleFeedScroll}>
          {loadingNoGo ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : noGoList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-10">
              <div className="text-[36px] mb-1">🚫</div>
              <div className="text-[17px] font-semibold text-white">No no-gos yet</div>
              <div className="text-[13px] text-text-muted leading-[1.6]">Recos you can't or won't do will appear here.</div>
            </div>
          ) : (
            <div className="px-4 pb-3 flex flex-col gap-3">
              {noGoList.map((reco) => (
                <RecoCard key={reco.id} reco={reco} viewMode={viewMode} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab picker overlay */}
      {tabDDOpen && (
        <div className="fixed inset-0 z-[110] bg-black/30" onClick={() => setTabDDOpen(false)} />
      )}

      {/* Filter backdrop */}
      {(catDDOpen || timeDDOpen || senderDDOpen) && (
        <div className="fixed inset-0 z-[110] bg-black/30" onClick={closeAllDD} />
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
          recommenderName={successState.reco.sender.display_name}
          sinBinWarning={successState.sinBinWarning}
        />
      )}

      {sinBinData && userId && (
        <SinBinModal
          open={!!sinBinData}
          onClose={() => setSinBinData(null)}
          senderId={sinBinData.senderId}
          senderName={sinBinData.senderName}
          recipientId={userId}
          category={sinBinData.category}
          offences={sinBinData.offences}
        />
      )}

      <MapSheet
        open={!!mapReco}
        onClose={() => setMapReco(null)}
        name={mapReco?.title ?? ''}
        address={mapReco?.meta?.location}
      />


      <BeenThereSheet
        open={!!beenThereReco}
        onClose={() => setBeenThereReco(null)}
        onRate={handleBeenThereRate}
        onRequestNew={handleBeenThereRequestNew}
        recoTitle={beenThereReco?.title ?? ''}
        senderFirstName={beenThereReco?.sender.display_name.split(' ')[0] ?? ''}
      />

      <NoGoSheet
        open={!!noGoReco}
        onClose={() => setNoGoReco(null)}
        onSubmit={handleNoGoSubmit}
        recoTitle={noGoReco?.title ?? ''}
        senderName={noGoReco?.sender.display_name.split(' ')[0] ?? ''}
      />

      {noGoSuccess && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
          onClick={() => setNoGoSuccess(null)}
        >
          <div className="bg-bg-elevated border border-border rounded-card px-8 py-10 text-center mx-6 max-w-[320px]">
            <div className="text-[40px] mb-4">🚫</div>
            <div className="text-[18px] font-semibold text-white mb-2 tracking-[-0.4px]">
              Got it
            </div>
            <div className="text-[14px] text-text-muted leading-[1.6]">
              You told {noGoSuccess.senderName} you aren't interested. They'll see your reason.
            </div>
            <button
              className="mt-6 px-6 py-2.5 rounded-input bg-bg-card border border-border text-[13px] font-semibold text-text-secondary hover:border-text-faint transition-colors"
              onClick={() => setNoGoSuccess(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
