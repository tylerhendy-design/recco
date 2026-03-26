'use client'

import { useState } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader, PlusCircle } from '@/components/ui/NavHeader'
import { CATEGORIES } from '@/constants/categories'
import Link from 'next/link'

const MY_LISTS = [
  {
    id: 'paris',
    name: 'Paris — a few things',
    count: 8,
    categories: ['restaurant', 'shopping', 'culture'],
    sharedWith: 'Huckle +3',
    status: 'shared',
  },
  {
    id: 'london',
    name: 'London essentials',
    count: 12,
    categories: ['restaurant', 'bar'],
    sharedWith: null,
    status: 'draft',
  },
]

const SHARED_LISTS = [
  {
    id: 'tokyo',
    name: "Tokyo — Sam's guide",
    count: 14,
    author: 'Sam Huckle',
    categories: ['restaurant', 'culture'],
    isNew: true,
  },
]

const EXTRA_CATS: Record<string, string> = {
  shopping: '#C084FC',
  bar: '#FB923C',
  culture: '#FB923C',
}

function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id.charAt(0).toUpperCase() + id.slice(1)
}

function SectionCard({ label, filterIcon, children }: { label: string; filterIcon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-1 mx-5">
      <div className="flex items-center justify-between mb-3.5">
        <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase">
          {label}
        </div>
        {filterIcon}
      </div>
      {children}
    </div>
  )
}

export default function ListsPage() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  // All unique categories across my lists
  const allCats = Array.from(new Set(MY_LISTS.flatMap((l) => l.categories)))

  const filteredMy = activeFilter
    ? MY_LISTS.filter((l) => l.categories.includes(activeFilter))
    : MY_LISTS

  const filteredShared = activeFilter
    ? SHARED_LISTS.filter((l) => l.categories.includes(activeFilter))
    : SHARED_LISTS

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="lists" rightAction={<PlusCircle href="/lists/new" />} />

      <div className="flex-1 overflow-y-auto scrollbar-none px-0 pt-4 flex flex-col gap-3 pb-6">

        {/* Your Lists */}
        <SectionCard
          label="Your lists"
          filterIcon={
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${filterOpen || activeFilter ? 'text-accent' : 'text-text-faint hover:text-text-muted'}`}
            >
              {activeFilter && (
                <span className="text-[11px] font-medium">{categoryLabel(activeFilter)}</span>
              )}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
            </button>
          }
        >
          {/* Filter chips */}
          {filterOpen && (
            <div className="flex flex-wrap gap-[6px] mb-3.5">
              <span
                onClick={() => setActiveFilter(null)}
                className={`text-[12px] font-medium px-2.5 py-[5px] rounded-chip border cursor-pointer transition-all ${
                  !activeFilter ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-dim'
                }`}
              >
                All
              </span>
              {allCats.map((cat) => {
                const color = CATEGORIES.find((c) => c.id === cat)?.color ?? EXTRA_CATS[cat] ?? '#888'
                const bg = CATEGORIES.find((c) => c.id === cat)?.bgColor ?? (EXTRA_CATS[cat] ? `${EXTRA_CATS[cat]}1a` : '#88888811')
                const isActive = activeFilter === cat
                return (
                  <span
                    key={cat}
                    onClick={() => setActiveFilter(isActive ? null : cat)}
                    className="text-[12px] font-medium px-2.5 py-[5px] rounded-chip border cursor-pointer transition-all"
                    style={isActive
                      ? { color, borderColor: color, background: bg }
                      : { color: '#909099', borderColor: '#2a2a30' }
                    }
                  >
                    {categoryLabel(cat)}
                  </span>
                )
              })}
            </div>
          )}

          {filteredMy.length > 0 ? filteredMy.map((list, i) => (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className={`flex justify-between items-center py-3 cursor-pointer hover:opacity-80 transition-opacity ${i < filteredMy.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div>
                <div className="text-[15px] font-medium text-white tracking-[-0.2px]">{list.name}</div>
                <div className="text-[11px] text-text-faint mt-[3px]">
                  {list.count} places · {list.categories.map(categoryLabel).join(', ')}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-xs text-text-dim capitalize">{list.status}</div>
                {list.sharedWith && (
                  <div className="text-[10px] text-text-faint mt-0.5">{list.sharedWith}</div>
                )}
              </div>
            </Link>
          )) : (
            <div className="py-3 text-[13px] text-text-faint">No lists in that category.</div>
          )}
        </SectionCard>

        {/* Shared with you */}
        <SectionCard label="Shared with you">
          {filteredShared.length > 0 ? filteredShared.map((list, i) => (
            <div
              key={list.id}
              className={`flex justify-between items-center py-3 cursor-pointer hover:opacity-80 transition-opacity ${i < filteredShared.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div>
                <div className="text-[15px] font-medium text-white tracking-[-0.2px]">{list.name}</div>
                <div className="text-[11px] text-text-faint mt-[3px]">
                  {list.count} places · {list.author}
                </div>
              </div>
              {list.isNew && (
                <div className="text-[11px] font-semibold bg-accent/10 text-accent px-2 py-[3px] rounded-md flex-shrink-0 ml-3">
                  New
                </div>
              )}
            </div>
          )) : (
            <div className="py-3 text-[13px] text-text-faint">Nothing shared with you yet.</div>
          )}
        </SectionCard>

      </div>
    </div>
  )
}
