'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { initials, getSentimentColor } from '@/lib/utils'
import { getCategoryLabel, getCategoryColor } from '@/constants/categories'
import type { Reco } from '@/types/app.types'

type Tab = 'active' | 'done'

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

  const [tab, setTab] = useState<Tab>('active')
  const [catFilter, setCatFilter] = useState('all')
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

  // Load done recos when switching to done tab
  useEffect(() => {
    if (tab === 'done' && userId && doneRecos.length === 0) {
      loadDone(userId)
    }
  }, [tab, userId])

  const allActive = [...manualRecos, ...dbRecos].filter((r) => !doneIds.has(r.id))
  const filtered = catFilter === 'all' ? allActive : allActive.filter((r) => r.category === catFilter)

  // Group done recos by category
  const doneByCategory = doneRecos.reduce<Record<string, Reco[]>>((acc, r) => {
    const key = r.category
    if (!acc[key]) acc[key] = []
    acc[key].push(r)
    return acc
  }, {})

  const categories = [...new Set(allActive.map((r) => r.category))].filter(Boolean)

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
    // Refresh done list if it's been loaded
    if (doneRecos.length > 0) loadDone(userId)
  }

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
          <button onClick={() => setManualAddOpen(true)} aria-label="Add reco manually" className="cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="4" rx="1"/>
              <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2"/>
              <line x1="12" y1="11" x2="12" y2="17"/>
              <line x1="9" y1="14" x2="15" y2="14"/>
            </svg>
          </button>
          <Link href="/notifications" className="relative cursor-pointer">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <div className="absolute -top-[3px] -right-[3px] w-2 h-2 rounded-full bg-accent" />
          </Link>
        </div>
      </div>

      {/* Greeting */}
      <div className="px-6 pt-4 pb-4 flex-shrink-0">
        <div className="text-[26px] font-semibold text-white leading-[1.2] tracking-[-0.6px] mb-4">
          Hey {firstName},
        </div>

        {/* Active / Done toggle */}
        <div className="flex items-center gap-1 bg-bg-card rounded-input p-1 w-fit">
          <button
            onClick={() => setTab('active')}
            className={`px-4 py-1.5 rounded-[6px] text-[13px] font-semibold transition-all ${
              tab === 'active' ? 'bg-bg-elevated text-white shadow-sm' : 'text-text-faint hover:text-text-muted'
            }`}
          >
            Active{allActive.length > 0 ? ` · ${allActive.length}` : ''}
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

      {/* ── ACTIVE TAB ── */}
      {tab === 'active' && (
        <>
          {/* Category filter pills */}
          {categories.length > 1 && (
            <div className="px-6 pb-3 flex-shrink-0 flex gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setCatFilter('all')}
                className={`text-[12px] font-semibold px-3 py-1 rounded-chip border flex-shrink-0 transition-all ${
                  catFilter === 'all' ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-faint'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat === catFilter ? 'all' : cat)}
                  className="text-[12px] font-semibold px-3 py-1 rounded-chip border flex-shrink-0 transition-all"
                  style={catFilter === cat
                    ? { borderColor: getCategoryColor(cat), color: getCategoryColor(cat), background: `${getCategoryColor(cat)}15` }
                    : { borderColor: '#2a2a30', color: '#6e6e78' }
                  }
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-y-auto scrollbar-none px-5 flex flex-col gap-3 pb-6">
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
                  When friends give you recos they'll appear here. Or ask someone for one.
                </div>
                <Link href="/get" className="mt-2 text-accent text-sm font-semibold">
                  Ask for a reco →
                </Link>
              </div>
            )}
          </div>
        </>
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
            const avgScore = recos.filter(r => r.score != null).reduce((sum, r, _, arr) => sum + (r.score ?? 0) / arr.length, 0)
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
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#6e6e78" strokeWidth="2.5" strokeLinecap="round"
                    className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                  >
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
