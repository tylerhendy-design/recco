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
  }, [])

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
  const [listExpanded, setListExpanded] = useState<Record<string, boolean>>({})
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

  // Derive sender options from grouped recos (including manual/instant-add senders)
  const senderOptions = useMemo(() => {
    const seen = new Map<string, { label: string; sub: string }>()
    for (const reco of grouped) {
      const manualName = reco.meta?.manual_sender_name as string | undefined
      if (manualName) {
        // Use a stable key for manual senders: "manual::Name"
        const key = `manual::${manualName.trim().toLowerCase()}`
        if (!seen.has(key)) {
          seen.set(key, {
            label: manualName.trim().split(' ')[0],
            sub: manualName.trim(),
          })
        }
      } else {
        for (const rec of reco.recommenders ?? []) {
          seen.set(rec.profile.id, {
            label: rec.profile.display_name.split(' ')[0],
            sub: `@${rec.profile.username}`,
          })
        }
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
      .filter((r) => {
        if (senderFilter === 'all') return true
        // Match manual senders by "manual::name" key
        const manualName = r.meta?.manual_sender_name as string | undefined
        if (manualName && senderFilter === `manual::${manualName.trim().toLowerCase()}`) return true
        return r.recommenders?.some((rec) => rec.profile.id === senderFilter) ?? false
      })
  }, [grouped, catFilter, timeFilter, senderFilter])

  const doneByCategory = useMemo(() =>
    doneRecos.reduce<Record<string, Reco[]>>((acc, r) => {
      const key = r.category === 'custom' && r.custom_cat ? r.custom_cat : r.category
      if (!acc[key]) acc[key] = []
      acc[key].push(r)
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
    router.push(`/reco?mode=give&${params.toString()}`)
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
          <Link href="/reco?mode=quick" aria-label="Instant add" className="flex items-center justify-center w-9 h-9">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
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

      {/* Filter pills — horizontal scrollable, compact */}
      {tab === 'todo' && (
      <div className="flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-5 py-2.5">
          {/* Category pill */}
          <button
            onClick={() => { setCatDDOpen(o => !o); setTimeDDOpen(false); setSenderDDOpen(false) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition-all flex-shrink-0 ${
              catFilter !== 'all' ? 'bg-accent text-accent-fg' : 'bg-bg-card border border-border text-text-secondary'
            }`}
          >
            {catLabel}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>

          {/* Time pill */}
          <button
            onClick={() => { setTimeDDOpen(o => !o); setCatDDOpen(false); setSenderDDOpen(false) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition-all flex-shrink-0 ${
              timeFilter !== 'all' ? 'bg-accent text-accent-fg' : 'bg-bg-card border border-border text-text-secondary'
            }`}
          >
            {timeLabel}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>

          {/* Sender pill */}
          <button
            onClick={() => { setSenderDDOpen(o => !o); setCatDDOpen(false); setTimeDDOpen(false) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition-all flex-shrink-0 ${
              senderFilter !== 'all' ? 'bg-accent text-accent-fg' : 'bg-bg-card border border-border text-text-secondary'
            }`}
          >
            {senderLabel}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>

          {/* Clear all */}
          {(catFilter !== 'all' || timeFilter !== 'all' || senderFilter !== 'all') && (
            <button
              onClick={() => { setCatFilter('all'); setTimeFilter('all'); setSenderFilter('all') }}
              className="flex-shrink-0 px-3 py-2 rounded-full text-[12px] font-semibold text-text-faint border border-dashed border-border"
            >
              Clear all ✕
            </button>
          )}
        </div>
      </div>
      )}

      {/* Filter bottom sheets — fixed position, above everything */}
      {catDDOpen && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setCatDDOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[201] bg-bg-elevated border-t border-border rounded-t-[20px] pb-8 max-w-[390px] mx-auto">
            <div className="flex justify-center py-3"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] px-6 mb-2">Category</div>
            {CATEGORY_FILTERS.map((f) => (
              <button key={f.value} onClick={() => { setCatFilter(f.value); setCatDDOpen(false) }} className={`w-full text-left px-6 py-3.5 text-[15px] active:bg-bg-card transition-colors ${catFilter === f.value ? 'text-accent font-semibold' : 'text-text-secondary'}`}>{f.label}</button>
            ))}
          </div>
        </>
      )}
      {timeDDOpen && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setTimeDDOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[201] bg-bg-elevated border-t border-border rounded-t-[20px] pb-8 max-w-[390px] mx-auto">
            <div className="flex justify-center py-3"><div className="w-10 h-1 rounded-full bg-border" /></div>
            <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] px-6 mb-2">Time</div>
            {TIME_FILTERS.map((f) => (
              <button key={f.value} onClick={() => { setTimeFilter(f.value); setTimeDDOpen(false) }} className={`w-full text-left px-6 py-3.5 text-[15px] active:bg-bg-card transition-colors ${timeFilter === f.value ? 'text-accent font-semibold' : 'text-text-secondary'}`}>{f.label}</button>
            ))}
          </div>
        </>
      )}
      {senderDDOpen && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/40" onClick={() => setSenderDDOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-[201] bg-bg-elevated border-t border-border rounded-t-[20px] pb-8 max-w-[390px] mx-auto max-h-[60vh] overflow-y-auto">
            <div className="sticky top-0 bg-bg-elevated">
              <div className="flex justify-center py-3"><div className="w-10 h-1 rounded-full bg-border" /></div>
              <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] px-6 mb-2">Sent by</div>
            </div>
            {senderOptions.map((f) => (
              <button key={f.value} onClick={() => { setSenderFilter(f.value); setSenderDDOpen(false) }} className={`w-full text-left px-6 py-3.5 active:bg-bg-card transition-colors ${senderFilter === f.value ? 'text-accent font-semibold' : 'text-text-secondary'}`}>
                <div className="text-[15px]">{f.label}</div>
                {f.sub && <div className="text-[11px] text-text-faint mt-0.5">{f.sub}</div>}
              </button>
            ))}
          </div>
        </>
      )}


      {/* ── TO DO TAB ── */}
      {tab === 'todo' && (
        <div className="flex-1 overflow-y-auto scrollbar-none" onScroll={handleFeedScroll}>
          <div className="px-5 pb-6" onClick={closeAllDD}>
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          )}

          {/* Cards — list mode uses category accordion, others render flat */}
          {!loading && previewMode !== 'nofriends' && viewMode === 'list' && filtered.length > 0 && (() => {
            const byCat: Record<string, typeof filtered> = {}
            for (const r of filtered) {
              const catKey = r.category === 'custom' && r.custom_cat ? r.custom_cat : r.category
              if (!byCat[catKey]) byCat[catKey] = []
              byCat[catKey].push(r)
            }
            return Object.entries(byCat).map(([cat, recos]) => (
              <div key={cat} className="border-b border-[#1a1a1e]">
                <button
                  onClick={() => setListExpanded(prev => ({ ...prev, [cat]: !prev[cat] }))}
                  className="w-full flex items-center justify-between px-2 py-3 hover:bg-bg-card/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(cat) }} />
                    <span className="text-[14px] font-semibold text-white tracking-[-0.3px]">{getCategoryLabel(cat)}</span>
                    <span className="text-[12px] text-text-faint">{recos.length}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="2.5" strokeLinecap="round"
                    className={`transition-transform duration-200 flex-shrink-0 ${listExpanded[cat] ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {listExpanded[cat] && recos.map((reco) => (
                  <RecoCard
                    key={reco.id}
                    reco={reco}
                    viewMode="list"
                    initialOpen={openRecoId === reco.id}
                    onMarkDone={setFeedbackReco}
                    onBeenThere={setBeenThereReco}
                    onNoGo={setNoGoReco}
                  />
                ))}
              </div>
            ))
          })()}

          {!loading && previewMode !== 'nofriends' && viewMode !== 'list' && filtered.map((reco, i) => (
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
              <Link href="/reco?mode=get" className="mt-2 text-accent text-sm font-semibold">
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
