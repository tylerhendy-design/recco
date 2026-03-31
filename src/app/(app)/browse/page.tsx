'use client'

import { useState } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { SentimentBadge } from '@/components/ui/SentimentBadge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { FeedbackSheet } from '@/components/overlays/FeedbackSheet'
import { BROWSE_SECTIONS, type SeedReco } from '@/lib/seed-recos'
import { useRecos } from '@/lib/context/RecosContext'
import { getCategoryLabel } from '@/constants/categories'
import Link from 'next/link'

type ActiveItem = SeedReco & { section: string }

function byLine(reco: SeedReco): string {
  const names = reco.recommenders?.map((r) => r.profile.display_name.split(' ')[0]) ?? []
  if (names.length === 0) return `Reco'd by ${reco.sender.display_name.split(' ')[0]}`
  if (names.length <= 2) return `Reco'd by ${names.join(', ')}`
  return `Reco'd by ${names[0]}, +${names.length - 1}`
}

export default function BrowsePage() {
  const { manualRecos } = useRecos()

  // Merge manual recos into sections (new categories get their own section)
  const sections = (() => {
    const base = BROWSE_SECTIONS.map((s) => ({ ...s, items: [...s.items] as SeedReco[] }))
    for (const reco of manualRecos) {
      const existing = base.find((s) => s.category === reco.category)
      if (existing) {
        existing.items.unshift(reco as SeedReco)
      } else {
        const label = reco.category === 'custom' && reco.custom_cat
          ? reco.custom_cat
          : getCategoryLabel(reco.category)
        base.push({ section: label, category: reco.category, items: [reco as SeedReco] })
      }
    }
    return base
  })()

  // All sections start collapsed
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [actionItem, setActionItem] = useState<ActiveItem | null>(null)
  const [feedbackItem, setFeedbackItem] = useState<ActiveItem | null>(null)
  const [noGoItem, setNoGoItem] = useState<ActiveItem | null>(null)
  const [noGoSent, setNoGoSent] = useState(false)
  // Track locally-completed items: id → score
  const [doneMap, setDoneMap] = useState<Record<string, number>>({})

  function toggleSection(section: string) {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  function openAction(item: SeedReco, section: string) {
    setActionItem({ ...item, section })
  }

  function handleMarkDone() {
    if (!actionItem) return
    setFeedbackItem(actionItem)
    setActionItem(null)
  }

  function handleNoGo() {
    if (!actionItem) return
    setNoGoItem(actionItem)
    setActionItem(null)
  }

  function sendNoGo() {
    setNoGoSent(true)
    setTimeout(() => {
      setNoGoSent(false)
      setNoGoItem(null)
    }, 1400)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="to do" closeHref="/home" />
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {sections.map((section) => {
          const isOpen = !!expanded[section.section]
          const incomplete = section.items.filter((i) => i.status !== 'done').length
          const total = section.items.length
          return (
          <div key={section.section}>
            {/* Section header — tappable to expand/collapse */}
            <button
              onClick={() => toggleSection(section.section)}
              className="w-full flex items-center justify-between px-6 pt-5 pb-3 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[16px] font-semibold tracking-[-0.3px] text-white">
                  {section.section}
                </span>
                <span className="text-[11px] font-medium text-text-dim">
                  {total} {incomplete > 0 ? `· ${incomplete} to do` : ''}
                </span>
              </div>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="#777780" strokeWidth="2.5" strokeLinecap="round"
                className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* Collapsible items */}
            {isOpen && section.items.map((item) => {
              const effectiveScore = doneMap[item.id] ?? item.score
              const isComplete = (item.status === 'done' || doneMap[item.id] != null) && effectiveScore != null
              const inner = (
                <div className="flex justify-between items-center px-6 py-3 border-b border-bg-card cursor-pointer hover:bg-bg-hover transition-colors">
                  <div>
                    <div className="text-[13px] font-medium text-text-secondary tracking-[-0.1px]">{item.title}</div>
                    <div className="text-[11px] text-text-dim mt-0.5">{byLine(item)}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isComplete ? (
                      <>
                        <SentimentBadge score={effectiveScore!} />
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 18l6-6-6-6"/>
                        </svg>
                      </>
                    ) : (
                      <span className="text-[9px] font-bold px-2 py-1 rounded-chip bg-bg-card text-text-faint uppercase tracking-[0.3px]">
                        Incomplete
                      </span>
                    )}
                  </div>
                </div>
              )

              if (isComplete && item.threadId && !doneMap[item.id]) {
                return (
                  <Link key={item.id} href={`/notifications/${item.threadId}`}>
                    {inner}
                  </Link>
                )
              }
              if (!isComplete) {
                return (
                  <div key={item.id} onClick={() => openAction(item, section.section)}>
                    {inner}
                  </div>
                )
              }
              return <div key={item.id}>{inner}</div>
            })}
          </div>
        )})}

      </div>

      {/* ── Action sheet for incomplete recos ── */}
      <BottomSheet open={!!actionItem} onClose={() => setActionItem(null)}>
        {actionItem && (
          <div className="px-5 pt-3 pb-8">
            {/* Reco info */}
            <div className="mb-5">
              <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-0.5">
                {actionItem.title}
              </div>
              <div className="text-[12px] text-text-faint">{byLine(actionItem)}</div>
            </div>

            {/* Mark as done */}
            <button
              onClick={handleMarkDone}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 mb-2.5 bg-accent/10 border border-accent/30 rounded-card hover:bg-accent/15 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="8" r="7"/>
                  <path d="M5 8l2.5 2.5L11 5.5"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-[14px] font-semibold text-accent">Mark as done</div>
                <div className="text-[11px] text-text-faint mt-0.5">Rate it and send feedback</div>
              </div>
            </button>

            {/* No-go */}
            <button
              onClick={handleNoGo}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 bg-bg-card border border-border rounded-card hover:border-text-faint transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#2a1a1a] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              <div className="text-left">
                <div className="text-[14px] font-semibold text-text-secondary">It's a no-go</div>
                <div className="text-[11px] text-text-faint mt-0.5">Notify them you're giving it a miss</div>
              </div>
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ── No-go confirmation sheet ── */}
      <BottomSheet open={!!noGoItem} onClose={() => { setNoGoItem(null); setNoGoSent(false) }}>
        {noGoItem && (
          <div className="px-5 pt-3 pb-8">
            <div className="text-[17px] font-semibold text-white tracking-[-0.3px] mb-0.5">
              {noGoItem.title}
            </div>
            <div className="text-[12px] text-text-faint mb-5">{byLine(noGoItem)}</div>

            <div className="text-[13px] font-semibold text-text-muted uppercase tracking-[0.3px] mb-2">
              Tell them why (optional)
            </div>
            <textarea
              className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans mb-4 resize-none min-h-[44px]"
              placeholder="e.g. Not really my kind of thing..."
              rows={1}
              onChange={(e) => { const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
            />

            <button
              onClick={sendNoGo}
              className={`w-full py-3.5 rounded-btn text-[14px] font-bold transition-all ${
                noGoSent
                  ? 'bg-bg-card border border-border text-text-faint'
                  : 'bg-[#1e0e0e] border border-bad/40 text-bad hover:bg-[#2a1010] transition-colors'
              }`}
            >
              {noGoSent ? 'Sent ✓' : "Notify them it's a no-go"}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ── Feedback sheet (after mark done) ── */}
      <FeedbackSheet
        open={!!feedbackItem}
        onClose={() => setFeedbackItem(null)}
        onSubmit={(score) => {
          if (feedbackItem) setDoneMap((prev) => ({ ...prev, [feedbackItem.id]: score }))
          setFeedbackItem(null)
        }}
        recoTitle={feedbackItem?.title ?? ''}
        recoCategory={feedbackItem?.section ?? ''}
      />
    </div>
  )
}
