'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { extractRecoCity } from '@/lib/city'
import { RecoCard } from '@/components/ui/RecoCard'
import { createClient } from '@/lib/supabase/client'
import { getCategoryLabel, getCategoryColor } from '@/constants/categories'
import type { Reco } from '@/types/app.types'

type CityGroup = {
  city: string
  recos: Reco[]
  categories: string[]
}

export default function ListsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [allRecos, setAllRecos] = useState<Reco[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [slideDir, setSlideDir] = useState<'in' | 'out' | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      // Fetch all recos the user has received (any status)
      const { data } = await supabase
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

      if (!data) { setLoading(false); return }

      const mapped: Reco[] = (data as any[])
        .filter((r: any) => r.recommendations)
        .map((r: any) => {
          const rec = r.recommendations
          return {
            id: rec.id,
            sender_id: rec.sender_id,
            sender: rec.profiles ?? { id: rec.sender_id, display_name: 'Unknown', username: '', avatar_url: null },
            category: rec.category,
            custom_cat: rec.custom_cat,
            title: rec.title,
            why_text: rec.why_text,
            why_audio_url: rec.why_audio_url,
            meta: rec.meta ?? {},
            created_at: rec.created_at,
            status: r.status,
            score: r.score,
            feedback_text: r.feedback_text,
            rated_at: r.rated_at,
          }
        })

      setAllRecos(mapped)
      setLoading(false)
    })
  }, [])

  function extractCity(reco: Reco): string | null {
    return extractRecoCity(reco.meta)
  }

  // Group recos by city — deduplicate by title+category (same reco from multiple senders = one entry)
  const cityGroups = useMemo(() => {
    const groups = new Map<string, Reco[]>()
    const seen = new Set<string>()

    for (const reco of allRecos) {
      const city = extractCity(reco)
      if (!city) continue
      if (catFilter && effectiveCat(reco) !== catFilter) continue
      // Deduplicate: same title + category = same reco
      const dedupeKey = `${reco.category}::${reco.title.toLowerCase().trim()}`
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      const key = city.toLowerCase()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(reco)
    }

    // Sort by count descending
    const result: CityGroup[] = []
    for (const [, recos] of groups) {
      const city = extractCity(recos[0])!
      const categories = [...new Set(recos.map(r => effectiveCat(r)))]
      result.push({ city, recos, categories })
    }
    result.sort((a, b) => b.recos.length - a.recos.length)
    return result
  }, [allRecos, catFilter])

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return cityGroups
    const q = search.trim().toLowerCase()
    return cityGroups.filter(g => g.city.toLowerCase().includes(q))
  }, [cityGroups, search])

  // Effective category: use custom_cat for custom recos so "Shopping" shows instead of "Custom"
  function effectiveCat(reco: Reco): string {
    return reco.category === 'custom' && reco.custom_cat ? reco.custom_cat.toLowerCase().trim() : reco.category
  }

  function effectiveCatLabel(cat: string): string {
    // If it's a known category, use the label. Otherwise it's a custom cat — capitalise it.
    const label = getCategoryLabel(cat)
    if (label !== 'Custom') return label
    return cat.charAt(0).toUpperCase() + cat.slice(1)
  }

  // All unique categories that have location data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    for (const reco of allRecos) {
      if (extractCity(reco)) cats.add(effectiveCat(reco))
    }
    return [...cats].sort()
  }, [allRecos])

  // Recos without a city
  const uncategorisedCount = allRecos.filter(r => !extractCity(r)).length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
        <div className="text-[22px] font-bold text-white tracking-[-0.5px]">Places</div>
      </div>

      {/* Search */}
      <div className="px-6 pb-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search a city..."
          className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white outline-none placeholder:text-text-faint font-sans"
        />
      </div>

      {/* Category filter chips */}
      {availableCategories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-6 pb-3 flex-shrink-0">
          <button
            onClick={() => setCatFilter(null)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold flex-shrink-0 transition-all ${
              !catFilter ? 'bg-accent text-accent-fg' : 'bg-bg-card border border-border text-text-faint'
            }`}
          >
            All
          </button>
          {availableCategories.map((cat) => {
            const color = getCategoryColor(cat)
            const active = catFilter === cat
            return (
              <button
                key={cat}
                onClick={() => setCatFilter(active ? null : cat)}
                className="px-3 py-1.5 rounded-full text-[12px] font-semibold flex-shrink-0 transition-all"
                style={active
                  ? { background: color, color: '#000' }
                  : { background: '#1a1a1e', color: '#888' }
                }
              >
                {effectiveCatLabel(cat)}
              </button>
            )
          })}
        </div>
      )}

      {/* Content — slides between city list and city detail */}
      <div className="flex-1 overflow-hidden relative">
        {/* City list view */}
        <div
          className={`absolute inset-0 overflow-y-auto scrollbar-none pb-6 transition-transform duration-300 ease-out ${
            selectedCity ? '-translate-x-full' : 'translate-x-0'
          }`}
        >
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
              <div className="text-[36px] mb-1">🗺️</div>
              <div className="text-[17px] font-semibold text-white">
                {search.trim() ? `No recos in "${search.trim()}"` : 'No location-based recos yet'}
              </div>
              <div className="text-[14px] text-text-muted leading-[1.6]">
                {search.trim()
                  ? 'Try a different city or clear the search.'
                  : 'When friends give you recos with locations, they will be grouped by city here. Perfect for planning trips.'
                }
              </div>
              {!search.trim() && (
                <Link href="/reco?mode=get" className="mt-2 text-accent text-[14px] font-semibold">Ask friends for recos →</Link>
              )}
            </div>
          ) : (
            filtered.map((group) => (
              <div key={group.city.toLowerCase()} className="border-b border-[#1a1a1e]">
                <button
                  onClick={() => { setSelectedCity(group.city.toLowerCase()); setSlideDir('in') }}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-card/30 transition-colors"
                >
                  <div>
                    <div className="text-[17px] font-bold text-white tracking-[-0.3px] text-left">{group.city}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[12px] text-text-faint">{group.recos.length} {group.recos.length === 1 ? 'reco' : 'recos'}</span>
                      <div className="flex gap-1">
                        {group.categories.slice(0, 4).map((cat) => (
                          <span
                            key={cat}
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: getCategoryColor(cat) }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* City detail view — slides in from right */}
        <div
          className={`absolute inset-0 overflow-y-auto scrollbar-none pb-6 transition-transform duration-300 ease-out ${
            selectedCity ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selectedCity && (() => {
            const group = cityGroups.find(g => g.city.toLowerCase() === selectedCity)
            if (!group) return null
            return (
              <>
                {/* Header — compact sticky bar */}
                <div className="sticky top-0 z-10 bg-bg-base border-b border-[#1a1a1e] px-4 py-2.5">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => { setSelectedCity(null); setSlideDir('out') }}
                      className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                      </svg>
                      {group.city}
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-text-faint">{group.recos.length} recos</span>
                      <button
                        onClick={async () => {
                          const url = `${window.location.origin}/lists?city=${encodeURIComponent(group.city)}`
                          const text = `${group.recos.length} recos in ${group.city} on RECO`
                          if (navigator.share) {
                            try { await navigator.share({ title: `RECO — ${group.city}`, text, url }); return } catch {}
                          }
                          await navigator.clipboard.writeText(url)
                          setCopied(true)
                          setTimeout(() => setCopied(false), 2000)
                        }}
                        className="flex items-center gap-1 text-[12px] font-semibold text-accent"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                        {copied ? 'Copied' : 'Share'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category pills — scrolls with content */}
                {group.categories.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-4 py-2.5">
                    {group.categories.map((cat) => {
                      const count = group.recos.filter(r => effectiveCat(r) === cat).length
                      return (
                        <span
                          key={cat}
                          className="text-[10px] font-bold uppercase tracking-[0.5px] px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{ background: `${getCategoryColor(cat)}22`, color: getCategoryColor(cat) }}
                        >
                          {effectiveCatLabel(cat)} {count}
                        </span>
                      )
                    })}
                  </div>
                )}

                {/* Reco cards */}
                <div className="px-4 pt-3 flex flex-col gap-3">
                  {group.recos.map((reco) => (
                    <RecoCard key={reco.id} reco={reco} />
                  ))}
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
