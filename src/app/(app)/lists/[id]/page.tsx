'use client'

import { useState, use } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { getCategoryColor, getCategoryLabel } from '@/constants/categories'
import { BottomSheet } from '@/components/ui/BottomSheet'

const PARIS_LIST = {
  title: 'Paris — a few things',
  meta: 'Tyler · 8 places · shared with Huckle, Sam, Horlock',
  sections: [
    {
      category: 'restaurant',
      items: [
        { name: 'Bistrot Paul Bert', note: 'Classic French bistro · 11e' },
        { name: 'Frenchie', note: 'Wine bar downstairs too · 2e' },
        { name: 'Le Comptoir du Relais', note: 'Book ahead · Saint-Germain' },
      ],
    },
    {
      category: 'shopping',
      items: [
        { name: 'Merci', note: 'Concept store · Le Marais' },
        { name: 'APC Surplus', note: 'Discounted APC · 6e' },
      ],
    },
    {
      category: 'culture',
      items: [
        { name: 'Palais de Tokyo', note: 'Contemporary art · 16e' },
        { name: 'Fondation Louis Vuitton', note: 'Book tickets · Bois de Boulogne' },
      ],
    },
  ],
}

const EXTRA_COLORS: Record<string, string> = {
  shopping: '#C084FC',
  culture: '#FB923C',
}

export default function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const list = PARIS_LIST
  const shareUrl = `https://reco.app/lists/${id}`

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader
        title={list.title}
        closeHref="/lists"
        rightAction={
          <button
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-accent border border-accent/40 rounded-chip px-2.5 py-1 hover:bg-accent/10 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
        }
      />
      <div className="px-6 py-1 pb-3 text-xs text-text-faint flex-shrink-0">{list.meta}</div>

      <div className="flex-1 overflow-y-auto scrollbar-none">
        {list.sections.map((section) => {
          const color = getCategoryColor(section.category) || EXTRA_COLORS[section.category] || '#888'
          const label = getCategoryLabel(section.category) || section.category.charAt(0).toUpperCase() + section.category.slice(1)
          return (
            <div key={section.category}>
              <div className="text-[10px] font-semibold tracking-[0.8px] uppercase text-text-faint px-6 pt-4 pb-2">
                {label}
              </div>
              {section.items.map((item) => (
                <div
                  key={item.name}
                  className="flex justify-between items-center px-6 py-3 border-b border-[#0e0e10] cursor-pointer hover:bg-bg-hover transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-white tracking-[-0.2px]">{item.name}</div>
                    <div className="text-[11px] text-text-faint mt-0.5">{item.note}</div>
                  </div>
                  <span
                    className="text-[10px] px-2 py-[3px] rounded-chip font-medium"
                    style={{ color, background: `${color}1a` }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* Share sheet */}
      <BottomSheet open={shareOpen} onClose={() => setShareOpen(false)}>
        <div className="p-6 pt-3">
          <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-1">{list.title}</div>
          <div className="text-xs text-text-faint mb-5">Anyone with this link can view the list</div>

          {/* Link row */}
          <div className="flex items-center gap-2 bg-bg-card border border-border rounded-input px-3 py-3 mb-4">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
            <span className="flex-1 text-xs text-text-secondary truncate">{shareUrl}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`flex-1 py-3 rounded-input text-[13px] font-semibold border transition-all ${copied ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-dim hover:border-text-faint'}`}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: list.title, url: shareUrl })
                } else {
                  handleCopy()
                }
              }}
              className="flex-[2] py-3 bg-accent text-accent-fg rounded-input text-[13px] font-bold hover:opacity-90 transition-opacity"
            >
              Share
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
