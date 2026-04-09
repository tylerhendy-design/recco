'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { createClient } from '@/lib/supabase/client'

type ListItem = {
  id: string
  title: string
  category: string
  note: string | null
  meta: Record<string, any>
  sort_order: number
}

type RecoList = {
  id: string
  title: string
  description: string | null
  status: string
  created_at: string
  items: ListItem[]
}

export default function ListsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [lists, setLists] = useState<RecoList[]>([])
  const [loading, setLoading] = useState(true)
  const [openListId, setOpenListId] = useState<string | null>(null)

  // Import state — two-step flow
  type ImportStep = 'idle' | 'paste' | 'text-fallback' | 'name'
  const [importStep, setImportStep] = useState<ImportStep>('idle')
  const [importUrl, setImportUrl] = useState('')
  const [importText, setImportText] = useState('')
  const [importTitle, setImportTitle] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<any[] | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Sharing
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      await loadLists(user.id)
    })
  }, [])

  async function loadLists(uid: string) {
    const { data } = await supabase
      .from('lists')
      .select('id, title, description, status, created_at, list_items (id, title, category, note, meta, sort_order)')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })

    setLists((data ?? []).map((l: any) => ({
      ...l,
      items: (l.list_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
    })))
    setLoading(false)
  }

  // Step 1: Paste URL → fetch places
  async function handleFetchPlaces() {
    if (!importUrl.trim()) return
    setImporting(true)
    setImportError(null)

    try {
      const res = await fetch('/api/import-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim() }),
      })
      const data = await res.json()
      const places = data.places ?? []
      if (places.length === 0) {
        // Offer text fallback instead of dead-ending
        setImportStep('text-fallback')
      } else {
        setImportResults(places)
        setImportStep('name')
      }
    } catch {
      setImportStep('text-fallback')
    }
    setImporting(false)
  }

  // Text fallback: user types place names
  async function handleTextImport() {
    if (!importText.trim()) return
    setImporting(true)

    try {
      const res = await fetch('/api/import-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText.trim() }),
      })
      const data = await res.json()
      const places = data.places ?? []
      if (places.length === 0) {
        setImportError('No places found. Try different names.')
      } else {
        setImportResults(places)
        setImportStep('name')
      }
    } catch {
      setImportError('Something went wrong. Try again.')
    }
    setImporting(false)
  }

  // Step 2: Name it → save
  async function handleSave() {
    if (!userId || !importResults || !importTitle.trim()) return
    setSaving(true)

    const { data: list, error } = await supabase
      .from('lists')
      .insert({ owner_id: userId, title: importTitle.trim(), status: 'published' })
      .select('id')
      .single()

    if (error || !list) { setSaving(false); return }

    const items = importResults.map((place, i) => ({
      list_id: list.id,
      category: 'restaurant',
      title: place.name,
      note: null,
      sort_order: i,
      meta: {
        address: place.address,
        city: place.city,
        artwork_url: place.imageUrl,
        website: place.website,
        maps_url: place.mapsUrl,
        place_id: place.placeId,
      },
    }))

    await supabase.from('list_items').insert(items)
    await loadLists(userId)

    // Reset
    setImportStep('idle')
    setImportUrl('')
    setImportText('')
    setImportTitle('')
    setImportResults(null)
    setSaving(false)
    setOpenListId(list.id)
  }

  function cancelImport() {
    setImportStep('idle')
    setImportUrl('')
    setImportText('')
    setImportTitle('')
    setImportResults(null)
    setImportError(null)
  }

  async function shareList(list: RecoList) {
    const url = `${window.location.origin}/r/list/${list.id}`
    if (navigator.share) {
      try { await navigator.share({ title: list.title, text: `${list.title} — ${list.items.length} places`, url }); return } catch {}
    }
    await navigator.clipboard.writeText(url)
    setCopiedId(`list-${list.id}`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function shareItem(item: ListItem) {
    const url = item.meta?.maps_url || item.meta?.website
    const text = `${item.title}${item.meta?.city ? ` — ${item.meta.city}` : ''}`
    if (navigator.share && url) {
      try { await navigator.share({ title: item.title, text, url }); return } catch {}
    }
    if (url) {
      await navigator.clipboard.writeText(url)
      setCopiedId(`item-${item.id}`)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader
        title="Your Lists"
        backHref="/profile"
        rightAction={
          importStep !== 'idle' ? (
            <button onClick={cancelImport} className="text-text-faint text-[13px] font-semibold">Cancel</button>
          ) : (
            <button onClick={() => setImportStep('paste')} className="text-accent text-[13px] font-semibold">+ Import</button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-24">

        {/* ── STEP 1: Paste your Maps link ── */}
        {importStep === 'paste' && (
          <div className="px-6 pt-6 pb-4">
            <div className="text-[20px] font-bold text-white tracking-[-0.5px] mb-1">Import from Google Maps</div>
            <div className="text-[13px] text-text-faint leading-[1.5] mb-5">
              Open your list in Google Maps, tap Share, copy the link, and paste it here.
            </div>

            <label className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] mb-1.5 block">Public list link</label>
            <input
              value={importUrl}
              onChange={(e) => { setImportUrl(e.target.value); setImportError(null) }}
              placeholder="https://maps.app.goo.gl/..."
              autoFocus
              className="w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans mb-3"
            />

            {importError && (
              <div className="text-[13px] text-bad mb-3">{importError}</div>
            )}

            <button
              onClick={handleFetchPlaces}
              disabled={importing || !importUrl.trim()}
              className={`w-full py-3.5 rounded-xl text-[15px] font-bold transition-all ${
                !importing && importUrl.trim() ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50'
              }`}
            >
              {importing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-accent-fg/30 border-t-accent-fg rounded-full animate-spin" />
                  Finding places...
                </span>
              ) : 'Next'}
            </button>
          </div>
        )}

        {/* ── FALLBACK: Type place names ── */}
        {importStep === 'text-fallback' && (
          <div className="px-6 pt-6 pb-4">
            <div className="text-[20px] font-bold text-white tracking-[-0.5px] mb-1">Type your places</div>
            <div className="text-[13px] text-text-faint leading-[1.5] mb-4">
              Google Maps lists are tricky to parse automatically. Type or paste your place names below — one per line — and we'll find them for you.
            </div>

            <textarea
              value={importText}
              onChange={(e) => { setImportText(e.target.value); setImportError(null); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
              placeholder={"Padella\nBao Soho\nLina Stores\nDishoom King's Cross"}
              rows={5}
              autoFocus
              className="w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[120px] mb-3"
            />

            {importError && (
              <div className="text-[13px] text-bad mb-3">{importError}</div>
            )}

            <button
              onClick={handleTextImport}
              disabled={importing || !importText.trim()}
              className={`w-full py-3.5 rounded-xl text-[15px] font-bold transition-all ${
                !importing && importText.trim() ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50'
              }`}
            >
              {importing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-accent-fg/30 border-t-accent-fg rounded-full animate-spin" />
                  Finding places...
                </span>
              ) : 'Find places'}
            </button>

            <button
              onClick={() => { setImportStep('paste'); setImportError(null) }}
              className="w-full py-3 text-[13px] font-semibold text-text-faint mt-2"
            >
              Back to link
            </button>
          </div>
        )}

        {/* ── STEP 2: Name your list ── */}
        {importStep === 'name' && importResults && (
          <div className="px-6 pt-6 pb-4">
            <div className="text-[20px] font-bold text-white tracking-[-0.5px] mb-1">Name your list</div>
            <div className="text-[13px] text-text-faint leading-[1.5] mb-4">
              {importResults.length} places found. Give this list a name.
            </div>

            <input
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder="e.g. London Restaurants, Date Night, Pizza"
              autoFocus
              className="w-full bg-bg-card border border-border rounded-xl px-4 py-3.5 text-[15px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans mb-4"
            />

            {/* Preview of found places */}
            <div className="mb-4">
              <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px] mb-2">Places</div>
              <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto scrollbar-none">
                {importResults.map((place, i) => (
                  <div key={i} className="flex items-center gap-3 bg-bg-card border border-border rounded-xl px-3 py-2.5">
                    {place.imageUrl ? (
                      <img src={place.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#1a1a1e] flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-white truncate">{place.name}</div>
                      {place.city && <div className="text-[11px] text-text-faint truncate">{place.city}</div>}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !importTitle.trim()}
              className={`w-full py-3.5 rounded-xl text-[15px] font-bold transition-all ${
                !saving && importTitle.trim() ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50'
              }`}
            >
              {saving ? 'Saving...' : `Save list (${importResults.length} places)`}
            </button>

            <button
              onClick={() => { setImportStep('paste'); setImportResults(null) }}
              className="w-full py-3 text-[13px] font-semibold text-text-faint mt-2"
            >
              Back
            </button>
          </div>
        )}

        {/* ── SAVED LISTS ── */}
        {importStep === 'idle' && loading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {importStep === 'idle' && !loading && lists.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
            <div className="text-[36px] mb-1">📋</div>
            <div className="text-[17px] font-semibold text-white">No lists yet</div>
            <div className="text-[14px] text-text-muted leading-[1.6]">
              Import your Google Maps lists to browse and share them.
            </div>
            <button
              onClick={() => setImportStep('paste')}
              className="mt-2 bg-accent text-accent-fg px-6 py-3 rounded-xl text-[14px] font-bold"
            >
              Import a list
            </button>
          </div>
        )}

        {importStep === 'idle' && !loading && lists.length > 0 && (
          <div className="px-4 pt-3">
            {lists.map((list) => {
              const isOpen = openListId === list.id
              const heroImage = list.items.find(i => i.meta?.artwork_url)?.meta?.artwork_url
              return (
                <div key={list.id} className="mb-3 bg-bg-card border border-border rounded-2xl overflow-hidden">
                  {/* List header — hero image + title */}
                  <button
                    onClick={() => setOpenListId(isOpen ? null : list.id)}
                    className="w-full text-left"
                  >
                    {heroImage && !isOpen && (
                      <div className="w-full h-28 relative">
                        <img src={heroImage} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-bg-card/40 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4">
                          <div className="text-[17px] font-bold text-white">{list.title}</div>
                          <div className="text-[12px] text-white/60">{list.items.length} places</div>
                        </div>
                      </div>
                    )}
                    {(!heroImage || isOpen) && (
                      <div className="px-4 py-3.5 flex items-center justify-between">
                        <div>
                          <div className="text-[16px] font-bold text-white">{list.title}</div>
                          <div className="text-[12px] text-text-faint mt-0.5">{list.items.length} places</div>
                        </div>
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"
                          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="M6 9l6 6 6-6"/>
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Expanded: full item list + share */}
                  {isOpen && (
                    <div className="border-t border-border">
                      {/* Share bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-bg-base/50">
                        <div className="text-[11px] font-semibold text-text-faint uppercase tracking-[0.5px]">{list.items.length} places</div>
                        <button
                          onClick={() => shareList(list)}
                          className="flex items-center gap-1.5 text-[12px] font-semibold text-accent"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                          </svg>
                          {copiedId === `list-${list.id}` ? 'Link copied' : 'Share list'}
                        </button>
                      </div>

                      {/* Items */}
                      <div className="px-3 pb-3">
                        {list.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 py-3 border-b border-[#1a1a1e] last:border-0">
                            {item.meta?.artwork_url ? (
                              <img src={item.meta.artwork_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-[#1a1a1e] flex items-center justify-center flex-shrink-0">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-[14px] font-semibold text-white truncate">{item.title}</div>
                              {item.meta?.city && (
                                <div className="text-[11px] text-text-faint mt-0.5">{item.meta.city}</div>
                              )}
                              {/* Item action row */}
                              <div className="flex items-center gap-3 mt-1.5">
                                {item.meta?.maps_url && (
                                  <a href={item.meta.maps_url} target="_blank" rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-accent flex items-center gap-1"
                                    onClick={e => e.stopPropagation()}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                                    Maps
                                  </a>
                                )}
                                {item.meta?.website && (
                                  <a href={item.meta.website} target="_blank" rel="noopener noreferrer"
                                    className="text-[11px] font-semibold text-accent flex items-center gap-1"
                                    onClick={e => e.stopPropagation()}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                                    Website
                                  </a>
                                )}
                                <button
                                  onClick={() => shareItem(item)}
                                  className="text-[11px] font-semibold text-text-faint flex items-center gap-1"
                                >
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                                  </svg>
                                  {copiedId === `item-${item.id}` ? 'Copied' : 'Share'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
