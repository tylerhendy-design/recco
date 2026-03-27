'use client'

import { useState, useMemo, useEffect } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { CATEGORIES } from '@/constants/categories'
import { fetchFriends } from '@/lib/data/friends'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import Link from 'next/link'

type Friend = { id: string; display_name: string; username: string; avatar_url: string | null }

export default function GetPage() {
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [friends, setFriends] = useState<Friend[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [friendSearch, setFriendSearch] = useState('')
  const [constraints, setConstraints] = useState<{ vibes: string; budget: string; location: string }>({
    vibes: '', budget: '', location: '',
  })
  const [openConstraint, setOpenConstraint] = useState<'vibes' | 'budget' | 'location' | null>(null)
  const [details, setDetails] = useState('')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const data = await fetchFriends(user.id)
      setFriends(data as Friend[])
    })
  }, [])

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) =>
      f.display_name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
    )
  }, [friends, friendSearch])

  const allSelected = friends.length > 0 && selectedIds.length === friends.length

  function togglePerson(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : friends.map((f) => f.id))
  }

  function toggleConstraint(key: 'vibes' | 'budget' | 'location') {
    setOpenConstraint((prev) => (prev === key ? null : key))
  }

  const displayedCats = CATEGORIES.filter((c) => c.id !== 'custom')
  const activeCat = selectedCat ? CATEGORIES.find((c) => c.id === selectedCat) : null
  const canSend = query.trim().length > 0 && selectedIds.length > 0

  if (sent) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <StatusBar />
        <NavHeader title="Get a reco" closeHref="/home" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-1">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </div>
          <div>
            <div className="text-[24px] font-bold text-white tracking-[-0.6px] leading-[1.2] mb-2">
              Ask and you shall receive.
            </div>
            <div className="text-[15px] text-text-dim leading-[1.6]">
              Request sent to {allSelected ? 'all your friends' : selectedIds.length === 1 ? friends.find((f) => f.id === selectedIds[0])?.display_name.split(' ')[0] : `${selectedIds.length} people`}.
            </div>
          </div>
          <Link
            href="/home"
            className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold text-center mt-2"
          >
            Back home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="Get a reco" closeHref="/home" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 pt-4 pb-6">

        {/* Card — styled like a RecoCard */}
        <div className="bg-bg-card border border-border rounded-card px-4 py-4">

          {/* Category row — mimics CategoryDot */}
          <div className="mb-3 -mx-1">
            <div className="flex gap-1.5 flex-wrap">
              {displayedCats.map((cat) => {
                const active = selectedCat === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(active ? null : cat.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-chip border transition-all text-[11px] font-semibold tracking-[0.4px] uppercase"
                    style={active
                      ? { color: cat.color, borderColor: cat.color, background: cat.bgColor }
                      : { color: '#444', borderColor: '#222226', background: 'transparent' }
                    }
                  >
                    <span
                      className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                      style={{ background: active ? cat.color : '#444' }}
                    />
                    {cat.label}
                  </button>
                )
              })}
              {/* Custom */}
              <button
                onClick={() => setSelectedCat(selectedCat === 'custom' ? null : 'custom')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-chip border transition-all text-[11px] font-semibold tracking-[0.4px] uppercase"
                style={selectedCat === 'custom'
                  ? { color: '#D4E23A', borderColor: '#D4E23A', background: 'rgba(212,226,58,0.08)' }
                  : { color: '#444', borderColor: '#222226', background: 'transparent' }
                }
              >
                <span
                  className="w-[6px] h-[6px] rounded-full flex-shrink-0"
                  style={{ background: selectedCat === 'custom' ? '#D4E23A' : '#444' }}
                />
                + Custom
              </button>
            </div>
            {selectedCat === 'custom' && (
              <input
                autoFocus
                className="mt-2.5 w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#333] font-sans"
                placeholder="e.g. Architecture, Coffee, Barbers…"
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
              />
            )}
          </div>

          {/* Title input — big like the reco card title */}
          <input
            className="w-full bg-transparent outline-none text-[26px] font-semibold text-white tracking-[-0.7px] leading-[1.1] placeholder:text-[#2a2a30] font-sans mb-3"
            placeholder="What are you after?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          {/* Constraint pills — like meta pills on the reco card */}
          <div className="flex gap-1.5 flex-wrap mb-4">
            {(['vibes', 'budget', 'location'] as const).map((key) => {
              const icons: Record<string, React.ReactNode> = {
                vibes: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
                budget: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v2m0 8v2M9.5 9.5c0-1.1.9-1.5 2.5-1.5s2.5.8 2.5 2c0 2.5-5 2-5 4.5 0 1.2 1.1 1.5 2.5 1.5s2.5-.4 2.5-1.5"/></svg>,
                location: <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              }
              const labels = { vibes: 'Vibes', budget: 'Budget', location: 'Location' }
              const filled = constraints[key].trim().length > 0
              const isOpen = openConstraint === key
              return (
                <button
                  key={key}
                  onClick={() => toggleConstraint(key)}
                  className="flex items-center gap-1 px-2 py-[3px] rounded-md border text-[11px] font-medium transition-all"
                  style={filled || isOpen
                    ? { color: '#D4E23A', borderColor: '#D4E23A44', background: 'rgba(212,226,58,0.08)' }
                    : { color: '#555', borderColor: '#1e1e22' }
                  }
                >
                  {icons[key]}
                  {filled ? constraints[key] : `+ ${labels[key]}`}
                </button>
              )
            })}
          </div>

          {/* Expanded constraint input */}
          {openConstraint && (
            <div className="mb-4 -mt-2">
              <input
                autoFocus
                className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-white outline-none placeholder:text-[#333] font-sans"
                placeholder={
                  openConstraint === 'vibes' ? 'e.g. cosy, lively, date night…' :
                  openConstraint === 'budget' ? 'e.g. under £30, cheap and cheerful…' :
                  'e.g. Soho, within 30 min of me…'
                }
                value={constraints[openConstraint]}
                onChange={(e) => setConstraints((prev) => ({ ...prev, [openConstraint!]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && setOpenConstraint(null)}
              />
            </div>
          )}

          {/* Extra details — mimics "Why?" on the reco card */}
          <div className="mb-4">
            <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1.5">
              Extra details
            </div>
            <textarea
              rows={2}
              className="w-full bg-transparent outline-none text-[13px] text-text-secondary leading-[1.5] placeholder:text-[#2a2a30] font-sans resize-none"
              placeholder="Anything that'll help narrow it down — occasion, who it's for, what you've already tried…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {/* Divider */}
          <div className="border-t border-[#0e0e10] mb-3" />

          {/* Ask section — mimics "Reco'd by" */}
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase">
              Ask
            </div>
            {friends.length > 0 && (
              <button
                onClick={toggleAll}
                className={`text-[11px] font-semibold transition-colors ${allSelected ? 'text-accent' : 'text-text-faint hover:text-text-muted'}`}
              >
                {allSelected ? '− Deselect all' : '+ Ask everyone'}
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-2.5">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="w-full bg-bg-base border border-border rounded-input pl-7 pr-3 py-1.5 text-[12px] text-text-secondary outline-none placeholder:text-[#333] font-sans"
              placeholder="Search friends…"
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>

          {/* Selected chips at top */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-[5px] mb-2">
              {selectedIds.map((id) => {
                const f = friends.find((fr) => fr.id === id)
                if (!f) return null
                return (
                  <button
                    key={id}
                    onClick={() => togglePerson(id)}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-chip border transition-all"
                    style={{ color: '#D4E23A', borderColor: '#D4E23A', background: 'rgba(212,226,58,0.08)' }}
                  >
                    {f.display_name.split(' ')[0]}
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )
              })}
            </div>
          )}

          {/* Friend list */}
          {filteredFriends.length === 0 ? (
            <div className="text-[12px] text-text-faint py-1">
              {friends.length === 0 ? 'No friends yet.' : 'No friends found.'}
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {filteredFriends.filter((f) => !selectedIds.includes(f.id)).map((f) => (
                <button
                  key={f.id}
                  onClick={() => togglePerson(f.id)}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-base transition-colors text-left w-full"
                >
                  <div className="w-6 h-6 rounded-full bg-bg-base border border-border flex items-center justify-center text-[9px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                      : initials(f.display_name)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] font-medium text-text-secondary">{f.display_name}</span>
                    {f.username && <span className="text-[11px] text-text-faint ml-1.5">@{f.username}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Send button */}
        <button
          onClick={() => canSend && setSent(true)}
          disabled={!canSend}
          className={`mt-3 w-full py-[15px] rounded-btn text-[15px] font-bold text-center transition-all ${
            canSend
              ? 'bg-accent text-accent-fg hover:opacity-90'
              : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          Request reco
        </button>
      </div>
    </div>
  )
}
