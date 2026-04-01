'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
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

  // Aliases for common regional names → clean city
  const CITY_ALIASES: Record<string, string> = {
    'greater london': 'London', 'city of london': 'London', 'central london': 'London',
    'inner london': 'London', 'outer london': 'London', 'city of westminster': 'London',
    'greater manchester': 'Manchester', 'city of manchester': 'Manchester',
    'city of edinburgh': 'Edinburgh', 'city of bristol': 'Bristol',
    'ile-de-france': 'Paris', 'arrondissement de paris': 'Paris',
    'north holland': 'Amsterdam', 'noord-holland': 'Amsterdam',
    'comunidad de madrid': 'Madrid', 'provincia de barcelona': 'Barcelona',
    'metropolitan city of rome': 'Rome', 'citta metropolitana di roma': 'Rome',
    'metropolitan city of milan': 'Milan', 'citta metropolitana di milano': 'Milan',
    'new york county': 'New York', 'manhattan': 'New York', 'brooklyn': 'New York',
    'queens': 'New York', 'the bronx': 'New York', 'staten island': 'New York',
  }

  function extractCity(reco: Reco): string | null {
    const city = reco.meta?.city as string | undefined
    const loc = reco.meta?.location as string | undefined

    // Strip postcodes from start/end of a string (e.g. "1016 HD Amsterdam" → "Amsterdam", "London SW1A 2AA" → "London")
    function stripPostcodes(s: string): string {
      return s
        // Leading: EU numeric postcodes "1016 HD Amsterdam", "75001 Paris"
        .replace(/^\d{3,5}\s*[A-Z]{0,2}\s+/i, '')
        // Leading: UK postcodes "EC2R 8AH London"
        .replace(/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\s+/i, '')
        // Trailing: EU numeric postcodes "Amsterdam 1016"
        .replace(/\s+\d{3,5}\s*[A-Z]{0,2}$/i, '')
        // Trailing: UK postcodes "London SW1A 2AA"
        .replace(/\s+[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, '')
        .trim()
    }

    // Clean the raw city/location value
    function cleanCity(raw: string): string | null {
      // Split by comma and process each part
      const parts = raw.split(',').map(p => p.trim()).filter(Boolean)

      for (const part of parts) {
        const cleaned = stripPostcodes(part)
        if (!cleaned || cleaned.length <= 2) continue
        const lower = cleaned.toLowerCase()
        if (CITY_ALIASES[lower]) return CITY_ALIASES[lower]
        // Skip if it's still just a postcode after cleaning
        if (/^\d/.test(cleaned) || /^[A-Z]{1,2}\d/i.test(cleaned)) continue
        return cleaned
      }

      // Fallback: try last non-postcode part
      for (let i = parts.length - 1; i >= 0; i--) {
        const cleaned = stripPostcodes(parts[i])
        if (!cleaned || cleaned.length <= 2) continue
        if (/^\d/.test(cleaned) || /^[A-Z]{1,2}\d/i.test(cleaned)) continue
        const lower = cleaned.toLowerCase()
        if (CITY_ALIASES[lower]) return CITY_ALIASES[lower]
        return cleaned
      }

      return null
    }

    if (city) {
      const result = cleanCity(city)
      if (result) return result
    }
    if (loc) {
      const result = cleanCity(loc)
      if (result) return result
    }

    return null
  }

  // Group recos by city
  const cityGroups = useMemo(() => {
    const groups = new Map<string, Reco[]>()

    for (const reco of allRecos) {
      const city = extractCity(reco)
      if (!city) continue
      if (catFilter && reco.category !== catFilter) continue
      const key = city.toLowerCase()
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(reco)
    }

    // Sort by count descending
    const result: CityGroup[] = []
    for (const [, recos] of groups) {
      const city = extractCity(recos[0])!
      const categories = [...new Set(recos.map(r => r.category))]
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

  // All unique categories that have location data
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    for (const reco of allRecos) {
      if (extractCity(reco)) cats.add(reco.category)
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
                {getCategoryLabel(cat)}
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
                {/* Header */}
                <div className="sticky top-0 z-10 bg-bg-base border-b border-[#1a1a1e]">
                  <div className="flex items-center justify-between px-4 py-3">
                    <button
                      onClick={() => { setSelectedCity(null); setSlideDir('out') }}
                      className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 12H5M12 5l-7 7 7 7" />
                      </svg>
                      Back
                    </button>
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
                      className="flex items-center gap-1.5 text-[12px] font-semibold text-accent"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                      {copied ? 'Copied' : 'Share'}
                    </button>
                  </div>
                  <div className="px-6 pb-3">
                    <div className="text-[26px] font-bold text-white tracking-[-0.6px]">{group.city}</div>
                    <div className="text-[13px] text-text-faint mt-0.5">{group.recos.length} {group.recos.length === 1 ? 'reco' : 'recos'}</div>
                  </div>
                  {/* Sub-category pills */}
                  {group.categories.length > 1 && (
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-6 pb-3">
                      {group.categories.map((cat) => {
                        const count = group.recos.filter(r => r.category === cat).length
                        return (
                          <span
                            key={cat}
                            className="text-[10px] font-bold uppercase tracking-[0.5px] px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{ background: `${getCategoryColor(cat)}22`, color: getCategoryColor(cat) }}
                          >
                            {getCategoryLabel(cat)} {count}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

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
