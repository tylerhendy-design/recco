'use client'

import { useState, useMemo } from 'react'
import { initials } from '@/lib/utils'

export interface PickableFriend {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
}

interface FriendPickerProps {
  friends: PickableFriend[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll?: () => void
  allSelected?: boolean
  label?: string
}

export function FriendPicker({ friends, selectedIds, onToggle, onToggleAll, allSelected, label = 'Ask' }: FriendPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => f.display_name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q))
  }, [search, friends])

  const unselected = (search.trim() ? filtered : friends).filter((f) => !selectedIds.includes(f.id))

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase">{label}</div>
        {onToggleAll && friends.length > 0 && (
          <button
            onClick={onToggleAll}
            className={`text-[11px] font-semibold transition-colors ${allSelected ? 'text-accent' : 'text-text-faint hover:text-text-muted'}`}
          >
            {allSelected ? '− Deselect all' : '+ Ask everyone'}
          </button>
        )}
      </div>

      <div className="relative mb-2.5">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          className="w-full bg-bg-card border border-border rounded-input pl-7 pr-3 py-3 text-[14px] text-white outline-none placeholder:text-[#444] focus:border-accent font-sans"
          placeholder="Search friends..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Search results */}
      {search.trim().length > 0 && (
        <div className="flex flex-col gap-0.5 mb-2">
          {unselected.length === 0 ? (
            <div className="text-[12px] text-text-faint px-2 py-1">No friends found.</div>
          ) : (
            unselected.map((f) => (
              <button
                key={f.id}
                onClick={() => { onToggle(f.id); setSearch('') }}
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
            ))
          )}
        </div>
      )}

      {/* Suggestions when not searching */}
      {!search.trim() && unselected.length > 0 && (
        <div className="flex flex-col gap-0.5 mb-2">
          <div className="text-[10px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1 px-2">Suggestions</div>
          {unselected.slice(0, 5).map((f) => (
            <button
              key={f.id}
              onClick={() => onToggle(f.id)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-bg-base transition-colors text-left w-full"
            >
              <div className="w-6 h-6 rounded-full bg-bg-base border border-border flex items-center justify-center text-[9px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                {f.avatar_url
                  ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                  : initials(f.display_name)
                }
              </div>
              <span className="text-[12px] font-medium text-text-secondary">{f.display_name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-[5px] mb-2">
          {selectedIds.map((id) => {
            const f = friends.find((fr) => fr.id === id)
            if (!f) return null
            return (
              <button
                key={id}
                onClick={() => onToggle(id)}
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
    </div>
  )
}
