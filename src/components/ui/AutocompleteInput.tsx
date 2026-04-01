'use client'

import { useState, useRef } from 'react'

export interface Suggestion {
  title: string
  subtitle: string | null
  imageUrl: string | null
  meta?: Record<string, string>
}

interface AutocompleteInputProps {
  category: string
  value: string
  onChange: (val: string) => void
  onSelect: (suggestion: Suggestion) => void
  placeholder?: string
  isVenue?: boolean
  userLat?: number | null
  userLng?: number | null
}

export function AutocompleteInput({
  category,
  value,
  onChange,
  onSelect,
  placeholder = 'Search...',
  isVenue = false,
  userLat,
  userLng,
}: AutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(val: string) {
    onChange(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (!val.trim() || val.trim().length < 2) {
      setSuggestions([])
      return
    }
    searchTimeout.current = setTimeout(async () => {
      setLoading(true)
      try {
        let url = `/api/search?q=${encodeURIComponent(val.trim())}&category=${category}`
        if (isVenue && userLat != null && userLng != null) {
          url += `&lat=${userLat}&lng=${userLng}`
        }
        const res = await fetch(url)
        const data = await res.json()
        setSuggestions(data)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function handleSelect(s: Suggestion) {
    onSelect(s)
    setSuggestions([])
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
  }

  function handleDismiss() {
    setSuggestions([])
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
  }

  return (
    <div className="mb-4">
      <input
        className="text-[26px] font-bold text-white tracking-[-0.6px] leading-[1.1] w-full bg-transparent outline-none placeholder:text-[#444] font-sans"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
      />
      {(suggestions.length > 0 || loading) && (
        <div className="mt-2 rounded-xl border border-border bg-bg-base overflow-hidden max-h-[280px] overflow-y-auto">
          {loading && suggestions.length === 0 ? (
            <div className="flex items-center justify-center py-3">
              <div className="w-3.5 h-3.5 border-2 border-border border-t-white/50 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(s)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left border-b border-border last:border-b-0 active:bg-white/5 transition-colors"
                >
                  {s.imageUrl ? (
                    <img src={s.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-bg-card flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-white truncate">{s.title}</div>
                    {s.subtitle && <div className="text-[11px] text-text-faint truncate">{s.subtitle}</div>}
                  </div>
                </button>
              ))}
              <button
                onClick={handleDismiss}
                className="w-full flex items-center gap-3 px-3 py-2.5 border-t border-border active:bg-white/5 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-bg-card border border-border flex items-center justify-center flex-shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate">Use "{value}"</div>
                  <div className="text-[11px] text-text-faint">Add it manually</div>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
