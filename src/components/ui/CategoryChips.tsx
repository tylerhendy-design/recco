'use client'

import { CATEGORIES, type CategoryId } from '@/constants/categories'

const displayedCats = CATEGORIES.filter((c) => c.id !== 'custom')

interface CategoryChipsProps {
  category: CategoryId | null
  customCat: string
  onCategoryChange: (cat: CategoryId | null) => void
  onCustomCatChange: (val: string) => void
}

export function CategoryChips({ category, customCat, onCategoryChange, onCustomCatChange }: CategoryChipsProps) {
  return (
    <>
      <div className="flex gap-2 flex-wrap mb-4">
        {displayedCats.map((cat) => {
          const active = category === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(active ? null : cat.id as CategoryId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip border transition-all text-[12px] font-semibold tracking-[0.3px] uppercase"
              style={active
                ? { color: cat.color, borderColor: cat.color, background: cat.bgColor }
                : { color: '#777', borderColor: '#2a2a30' }
              }
            >
              <span className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: active ? cat.color : '#555' }} />
              {cat.label}
            </button>
          )
        })}
        <button
          onClick={() => onCategoryChange(category === 'custom' ? null : 'custom')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-chip transition-all text-[12px] font-semibold tracking-[0.3px] uppercase"
          style={category === 'custom'
            ? { color: '#D4E23A', border: '1px solid #D4E23A', background: 'rgba(212,226,58,0.08)' }
            : { color: '#777', border: '1px dashed #3a3a40' }
          }
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Custom
        </button>
      </div>
      {category === 'custom' && (
        <input
          autoFocus
          className="mb-4 w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
          placeholder="e.g. Architecture, Coffee, Barbers..."
          value={customCat}
          onChange={(e) => onCustomCatChange(e.target.value)}
        />
      )}
    </>
  )
}
