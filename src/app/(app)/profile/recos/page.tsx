'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { RecoCard } from '@/components/ui/RecoCard'
import { createClient } from '@/lib/supabase/client'
import { getCategoryLabel, getCategoryColor } from '@/constants/categories'
import type { Reco } from '@/types/app.types'

type Filter = 'given' | 'received' | 'completed' | 'nogos'

const TITLES: Record<Filter, string> = {
  given: 'Recos Given',
  received: 'All Received',
  completed: 'Completed',
  nogos: 'No Gos',
}

export default function ProfileRecosPage() {
  return <Suspense><ProfileRecosInner /></Suspense>
}

function ProfileRecosInner() {
  const searchParams = useSearchParams()
  const filter = (searchParams.get('filter') as Filter) ?? 'given'
  const [recos, setRecos] = useState<Reco[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let data: any[] = []

      if (filter === 'given') {
        // Recos I sent to others
        const { data: sent } = await supabase
          .from('recommendations')
          .select(`
            id, sender_id, category, custom_cat, title,
            why_text, why_audio_url, meta, created_at,
            profiles (id, display_name, username, avatar_url),
            reco_recipients (id, recipient_id, status, score, feedback_text, rated_at,
              profiles:recipient_id (id, display_name, username, avatar_url)
            )
          `)
          .eq('sender_id', user.id)
          .order('created_at', { ascending: false })

        // Exclude Quick Add recos (manual_sender_name = self-added, not "given")
        data = (sent ?? []).filter((r: any) => !r.meta?.manual_sender_name).map((r: any) => {
          const recipients = (r.reco_recipients ?? []).map((rr: any) => ({
            name: rr.profiles?.display_name ?? 'Unknown',
            status: rr.status,
            score: rr.score,
          }))
          return {
            id: r.id,
            sender_id: r.sender_id,
            sender: r.profiles ?? { id: r.sender_id, display_name: 'You', username: '', avatar_url: null },
            category: r.category,
            custom_cat: r.custom_cat,
            title: r.title,
            why_text: r.why_text,
            why_audio_url: r.why_audio_url,
            meta: r.meta ?? {},
            created_at: r.created_at,
            status: recipients[0]?.status ?? 'unseen',
            score: recipients[0]?.score,
            _recipients: recipients,
          }
        })
      } else {
        // Recos received by me (with different status filters)
        const statusFilter = filter === 'completed' ? 'done' : filter === 'nogos' ? 'no_go' : undefined
        let query = supabase
          .from('reco_recipients')
          .select(`
            id, status, score, feedback_text, rated_at,
            recommendations (
              id, sender_id, category, custom_cat, title,
              why_text, why_audio_url, meta, created_at,
              profiles (id, display_name, username, avatar_url)
            )
          `)
          .eq('recipient_id', user.id)
          .order('created_at', { ascending: false })

        if (statusFilter) {
          query = query.eq('status', statusFilter)
        }

        const { data: rows } = await query
        data = (rows ?? [])
          .filter((row: any) => row.recommendations)
          .map((row: any) => {
            const r = row.recommendations
            const sender = r.profiles
            return {
              id: r.id,
              sender_id: r.sender_id,
              sender: sender ?? { id: r.sender_id, display_name: 'Unknown', username: '', avatar_url: null },
              category: r.category,
              custom_cat: r.custom_cat,
              title: r.title,
              why_text: r.why_text,
              why_audio_url: r.why_audio_url,
              meta: r.meta ?? {},
              created_at: r.created_at,
              status: row.status,
              score: row.score,
              feedback_text: row.feedback_text,
              rated_at: row.rated_at,
              recommenders: (r.meta as any)?.manual_sender_name ? undefined : [{
                profile: sender ?? { id: r.sender_id, display_name: 'Unknown', username: '', avatar_url: null },
                why_text: r.why_text ?? undefined,
                tier: 'clan' as const,
              }],
            }
          })
      }

      setRecos(data)
      setLoading(false)
    }
    load()
  }, [filter])

  // Group by category for the "given" view
  const byCategory = useMemo(() => {
    const map = new Map<string, typeof recos>()
    for (const r of recos) {
      const key = r.category === 'custom' && r.custom_cat ? r.custom_cat : r.category
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [recos])

  // Group by score for "completed" view
  const [scoreFilter, setScoreFilter] = useState<number | null>(null)
  const byScore = useMemo(() => {
    if (filter !== 'completed') return new Map<number, typeof recos>()
    const map = new Map<number, typeof recos>()
    for (const r of recos) {
      const s = r.score ?? 0
      if (!map.has(s)) map.set(s, [])
      map.get(s)!.push(r)
    }
    return map
  }, [recos, filter])

  const scoreCounts = useMemo(() => {
    return Array.from({ length: 10 }, (_, i) => ({
      score: 10 - i,
      count: byScore.get(10 - i)?.length ?? 0,
    })).filter(s => s.count > 0)
  }, [byScore])

  const filteredByScore = useMemo(() => {
    if (scoreFilter === null) return recos
    return recos.filter(r => r.score === scoreFilter)
  }, [recos, scoreFilter])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title={TITLES[filter] ?? 'Recos'} backHref="/profile" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-2 pb-24">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : recos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-[16px] font-semibold text-white mb-2">Nothing here yet</div>
            <div className="text-[13px] text-text-faint">
              {filter === 'given' ? 'Recos you send will appear here.' :
               filter === 'completed' ? 'Recos you complete will appear here.' :
               filter === 'nogos' ? 'Recos you pass on will appear here.' :
               'Recos sent to you will appear here.'}
            </div>
          </div>
        ) : filter === 'given' ? (
          // Given view — grouped by category with recipient info
          byCategory.map(([cat, catRecos]) => (
            <div key={cat} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ background: getCategoryColor(cat) }} />
                <span className="text-[12px] font-semibold text-text-faint uppercase tracking-[0.5px]">
                  {getCategoryLabel(cat) !== cat ? getCategoryLabel(cat) : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </span>
                <span className="text-[11px] text-text-faint">({catRecos.length})</span>
              </div>
              {catRecos.map((reco: any) => (
                <div key={reco.id} className="mb-2 bg-bg-card border border-border rounded-card px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-semibold text-white truncate">{reco.title}</div>
                      {reco._recipients && reco._recipients.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {reco._recipients.map((r: any, i: number) => (
                            <span key={i} className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                              r.status === 'done' ? 'border-green-500/40 text-green-400 bg-green-500/10' :
                              r.status === 'no_go' ? 'border-red-500/40 text-red-400 bg-red-500/10' :
                              'border-border text-text-faint bg-bg-base'
                            }`}>
                              {r.name}
                              {r.score != null && <span className="ml-1 font-bold">{r.score}/10</span>}
                              {r.status === 'no_go' && ' ✕'}
                              {r.status === 'unseen' && ' · pending'}
                              {r.status === 'seen' && ' · seen'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {reco.meta?.artwork_url && (
                      <img src={reco.meta.artwork_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-[10px] text-text-faint mt-1.5">
                    {new Date(reco.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : filter === 'completed' ? (
          // Completed view — score filter + cards
          <>
            {scoreCounts.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-none mb-3">
                <button
                  onClick={() => setScoreFilter(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                    scoreFilter === null ? 'bg-accent text-accent-fg' : 'bg-bg-card border border-border text-text-secondary'
                  }`}
                >
                  All ({recos.length})
                </button>
                {scoreCounts.map(({ score, count }) => (
                  <button
                    key={score}
                    onClick={() => setScoreFilter(scoreFilter === score ? null : score)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                      scoreFilter === score ? 'bg-accent text-accent-fg' : 'bg-bg-card border border-border text-text-secondary'
                    }`}
                  >
                    {score}/10 ({count})
                  </button>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {filteredByScore.map((reco) => (
                <RecoCard key={reco.id} reco={reco as Reco} viewMode="full" />
              ))}
            </div>
          </>
        ) : (
          // Received/NoGos view — standard reco cards
          <div className="flex flex-col gap-3">
            {recos.map((reco) => (
              <RecoCard key={reco.id} reco={reco as Reco} viewMode="full" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
