'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { LocationPill } from '@/components/ui/LocationPill'
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
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [lists, setLists] = useState<RecoList[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedList, setExpandedList] = useState<string | null>(null)

  // Import state
  const [showImport, setShowImport] = useState(false)
  const [importTitle, setImportTitle] = useState('')
  const [importInput, setImportInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<any[] | null>(null)
  const [savingList, setSavingList] = useState(false)
  const [copiedListId, setCopiedListId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('lists')
        .select('id, title, description, status, created_at, list_items (id, title, category, note, meta, sort_order)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      const mapped = (data ?? []).map((l: any) => ({
        ...l,
        items: (l.list_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }))
      setLists(mapped)
      setLoading(false)
    })
  }, [])

  async function handleImport() {
    if (!importInput.trim()) return
    setImporting(true)

    // Detect if input is a URL or plain text
    const isUrl = importInput.trim().startsWith('http')
    const body = isUrl
      ? { url: importInput.trim() }
      : { text: importInput.trim() }

    try {
      const res = await fetch('/api/import-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      setImportResults(data.places ?? [])
    } catch {
      setImportResults([])
    }
    setImporting(false)
  }

  async function handleSaveImportedList() {
    if (!userId || !importResults || importResults.length === 0 || !importTitle.trim()) return
    setSavingList(true)

    // Create the list
    const { data: list, error: listErr } = await supabase
      .from('lists')
      .insert({
        owner_id: userId,
        title: importTitle.trim(),
        status: 'published',
      })
      .select('id')
      .single()

    if (listErr || !list) { setSavingList(false); return }

    // Insert items
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

    // Refresh lists
    const { data } = await supabase
      .from('lists')
      .select('id, title, description, status, created_at, list_items (id, title, category, note, meta, sort_order)')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    setLists((data ?? []).map((l: any) => ({ ...l, items: (l.list_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order) })))
    setShowImport(false)
    setImportInput('')
    setImportTitle('')
    setImportResults(null)
    setSavingList(false)
  }

  async function handleShareList(list: RecoList) {
    const url = `${window.location.origin}/r/list/${list.id}`
    const text = `${list.title} — ${list.items.length} places on RECO`
    if (navigator.share) {
      try { await navigator.share({ title: `RECO — ${list.title}`, text, url }); return } catch {}
    }
    await navigator.clipboard.writeText(url)
    setCopiedListId(list.id)
    setTimeout(() => setCopiedListId(null), 2000)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader
        title="Your Lists"
        backHref="/profile"
        rightAction={
          <button onClick={() => setShowImport(!showImport)} className="text-accent text-[13px] font-semibold">
            {showImport ? 'Cancel' : '+ Import'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-24">

        {/* Import panel */}
        {showImport && (
          <div className="px-6 pt-4 pb-4 border-b border-border">
            <div className="text-[15px] font-semibold text-white mb-1">Import a list</div>
            <div className="text-[12px] text-text-faint leading-[1.5] mb-3">
              Paste a Google Maps list link, or type place names — one per line.
            </div>

            <input
              value={importTitle}
              onChange={(e) => setImportTitle(e.target.value)}
              placeholder="List name (e.g. Pizza, Pubs, Bakeries)"
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans mb-2"
            />

            <textarea
              value={importInput}
              onChange={(e) => { setImportInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
              placeholder={"Paste a Google Maps list link\nor type places — one per line:\n\nPadella\nBao Soho\nLina Stores"}
              rows={3}
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[80px] mb-3"
            />

            {!importResults && (
              <button
                onClick={handleImport}
                disabled={importing || !importInput.trim() || !importTitle.trim()}
                className={`w-full py-3 rounded-btn text-[14px] font-bold ${
                  !importing && importInput.trim() && importTitle.trim()
                    ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50'
                }`}
              >
                {importing ? 'Finding places...' : 'Find places'}
              </button>
            )}

            {/* Import results */}
            {importResults && importResults.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-accent uppercase tracking-[0.5px] mb-2">
                  {importResults.length} places found
                </div>
                <div className="flex flex-col gap-2 mb-3">
                  {importResults.map((place, i) => (
                    <div key={i} className="flex items-center gap-3 bg-bg-card border border-border rounded-xl p-3">
                      {place.imageUrl ? (
                        <img src={place.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#1a1a1e] flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-white truncate">{place.name}</div>
                        {place.city && <div className="text-[11px] text-text-faint truncate">{place.city}</div>}
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveImportedList}
                  disabled={savingList}
                  className="w-full py-3 bg-accent text-accent-fg rounded-btn text-[14px] font-bold"
                >
                  {savingList ? 'Saving...' : `Save "${importTitle.trim()}" (${importResults.length} places)`}
                </button>
              </div>
            )}

            {importResults && importResults.length === 0 && (
              <div className="text-[13px] text-text-faint text-center py-4">
                No places found. Try typing names one per line.
              </div>
            )}
          </div>
        )}

        {/* Lists */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : lists.length === 0 && !showImport ? (
          <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-3">
            <div className="text-[36px] mb-1">📋</div>
            <div className="text-[17px] font-semibold text-white">No lists yet</div>
            <div className="text-[14px] text-text-muted leading-[1.6]">
              Import your Google Maps lists or create one from scratch.
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="mt-2 bg-accent text-accent-fg px-6 py-3 rounded-btn text-[14px] font-bold"
            >
              Import a list
            </button>
          </div>
        ) : (
          <div className="px-4 pt-3">
            {lists.map((list) => {
              const isOpen = expandedList === list.id
              return (
                <div key={list.id} className="mb-3 bg-bg-card border border-border rounded-card overflow-hidden">
                  <button
                    onClick={() => setExpandedList(isOpen ? null : list.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  >
                    <div>
                      <div className="text-[15px] font-semibold text-white">{list.title}</div>
                      <div className="text-[12px] text-text-faint mt-0.5">{list.items.length} {list.items.length === 1 ? 'place' : 'places'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShareList(list) }}
                        className="text-[11px] font-semibold text-accent px-2 py-1"
                      >
                        {copiedListId === list.id ? 'Copied' : 'Share'}
                      </button>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round"
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-border pt-3">
                      {list.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-[#1a1a1e] last:border-0">
                          {item.meta?.artwork_url ? (
                            <img src={item.meta.artwork_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#1a1a1e] flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-[14px] font-semibold text-white truncate">{item.title}</div>
                            {item.meta?.city && (
                              <div className="text-[11px] text-text-faint mt-0.5">{item.meta.city}</div>
                            )}
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            {item.meta?.maps_url && (
                              <a href={item.meta.maps_url} target="_blank" rel="noopener noreferrer" className="text-accent" onClick={(e) => e.stopPropagation()}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                              </a>
                            )}
                            {item.meta?.website && (
                              <a href={item.meta.website} target="_blank" rel="noopener noreferrer" className="text-accent" onClick={(e) => e.stopPropagation()}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
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
