'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { CategoryChip } from '@/components/ui/CategoryChip'
import { VoiceButton } from '@/components/ui/VoiceButton'
import { CATEGORIES, type CategoryId } from '@/constants/categories'
import { today } from '@/lib/utils'

const PEOPLE = [
  { id: 'u1', name: 'Huckle', active: true },
  { id: 'u2', name: 'Tyler', active: false },
  { id: 'u3', name: 'Horlock', active: false },
  { id: 'u4', name: 'Mum', active: false },
  { id: 'u5', name: 'Mick', sinbin: true, active: false },
]

function SectionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-5">
      <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase mb-3.5">
        {label}
      </div>
      {children}
    </div>
  )
}

export default function SendPage() {
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [people, setPeople] = useState(PEOPLE)
  const [friendSearch, setFriendSearch] = useState('')
  const [links, setLinks] = useState<string[]>([''])

  const catDef = CATEGORIES.find((c) => c.id === category)

  function togglePerson(id: string) {
    setPeople((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p))
  }

  const filteredPeople = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return people
    return people.filter((p) => p.name.toLowerCase().includes(q))
  }, [friendSearch, people])

  const anyActive = people.some((p) => p.active)
  const canSend = title.trim().length > 0 && anyActive
  const [sent, setSent] = useState(false)

  // Simulated recent bad recos for the active recipients
  const recentBadRecos = people
    .filter((p) => p.active && !p.sinbin)
    .flatMap((p) =>
      p.name === 'Huckle' ? [{ person: 'Huckle', title: 'Padella', score: 34 }] : []
    )

  if (sent) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <StatusBar />
        <NavHeader title="give a reco" closeHref="/home" />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <div className="text-[24px] font-bold text-white tracking-[-0.6px] leading-[1.2] mb-2">
              Reco sent. Good job.
            </div>
            <div className="text-[15px] text-text-dim leading-[1.6]">
              Good luck — we hope they like it.
            </div>
          </div>

          {recentBadRecos.length > 0 && (
            <div className="w-full bg-bad/5 border border-bad/20 rounded-card px-4 py-3.5 text-left">
              <div className="text-[11px] font-semibold text-bad/80 uppercase tracking-[0.5px] mb-2">Heads up</div>
              <div className="text-[13px] text-text-secondary leading-[1.5]">
                You recently gave {recentBadRecos[0].person} a bad reco
                {recentBadRecos[0].title ? ` (${recentBadRecos[0].title})` : ''}. One more bad one and you're in the sin bin for this category.
              </div>
            </div>
          )}

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
      <NavHeader title="give a reco" closeHref="/home" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-5 pt-4 flex flex-col gap-3 pb-6">

        {/* Category */}
        <SectionCard label="Category">
          <div className="flex flex-wrap gap-[7px]">
            {CATEGORIES.map((cat) => (
              <CategoryChip
                key={cat.id}
                id={cat.id}
                selected={category === cat.id}
                dashed={cat.id === 'custom'}
                onClick={() => setCategory(cat.id === category ? null : cat.id)}
              />
            ))}
          </div>
        </SectionCard>

        {/* What */}
        <SectionCard label="What?">
          <input
            className="bg-transparent outline-none text-white font-sans text-[17px] font-normal w-full tracking-[-0.3px] placeholder:text-[#2a2a30]"
            placeholder="Name it..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </SectionCard>

        {/* Category-specific fields */}
        {catDef && catDef.extraFields.length > 0 && (
          <SectionCard label="Details">
            {catDef.extraFields.map((field) => {
              if (field.type === 'image') return (
                <div key={field.id} className="mb-3 last:mb-0">
                  <div className="text-[11px] font-medium text-text-faint uppercase tracking-[0.4px] mb-1.5">{field.label}</div>
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                    />
                    <div className="border-[1.5px] border-dashed border-border rounded-input p-5 text-center hover:border-accent/50 transition-colors">
                      <div className="flex flex-col items-center gap-2">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <div className="text-[12px] text-text-dim">
                          <span className="text-accent font-semibold">Take a photo</span>
                          <span className="text-text-faint"> or choose from library</span>
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              )
              if (field.type === 'date') return (
                <div key={field.id} className="mb-3 last:mb-0">
                  <div className="text-[11px] font-medium text-text-faint uppercase tracking-[0.4px] mb-1.5">{field.label}</div>
                  <LinkRow icon="calendar">
                    <input className="bg-transparent border-none outline-none text-text-secondary font-sans text-[13px] flex-1" defaultValue={today()} />
                  </LinkRow>
                </div>
              )
              if (field.type === 'spotify') return (
                <div key={field.id} className="mb-3 last:mb-0">
                  <div className="text-[11px] font-medium text-text-faint uppercase tracking-[0.4px] mb-1.5 flex items-center gap-2">
                    {field.label}
                    {field.sublabel && <span className="text-spotify text-[9px] font-normal normal-case tracking-normal">{field.sublabel}</span>}
                  </div>
                  <LinkRow icon="spotify">
                    <input className="bg-transparent border-none outline-none text-text-secondary font-sans text-[13px] flex-1 placeholder:text-[#333338]" placeholder={field.placeholder} />
                  </LinkRow>
                </div>
              )
              const iconType = field.type === 'location' ? 'pin' : field.id === 'instagram' ? 'instagram' : 'link'
              return (
                <div key={field.id} className="mb-3 last:mb-0">
                  <div className="text-[11px] font-medium text-text-faint uppercase tracking-[0.4px] mb-1.5">{field.label}</div>
                  <LinkRow icon={iconType as any}>
                    <input className="bg-transparent border-none outline-none text-text-secondary font-sans text-[13px] flex-1 placeholder:text-[#333338]" placeholder={field.placeholder} />
                  </LinkRow>
                </div>
              )
            })}
          </SectionCard>
        )}

        {/* Links — always visible */}
        <SectionCard label="Links">
          <div className="flex flex-col gap-2">
            {links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 bg-bg-base border border-border rounded-input px-3 py-2.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                  </svg>
                  <input
                    className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-border font-sans"
                    placeholder="Paste a URL..."
                    value={link}
                    onChange={(e) => {
                      const next = [...links]
                      next[i] = e.target.value
                      setLinks(next)
                    }}
                  />
                </div>
                {links.length > 1 && (
                  <button
                    onClick={() => setLinks(links.filter((_, j) => j !== i))}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-text-faint hover:text-bad transition-colors flex-shrink-0"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => setLinks([...links, ''])}
            className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-text-dim hover:text-text-secondary transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add another link
          </button>
        </SectionCard>

        {/* To (recipients) */}
        <SectionCard label="To">
          <div className="relative mb-3">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
              width="11" height="11" viewBox="0 0 24 24" fill="none"
              stroke="#777" strokeWidth="2.5" strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              className="w-full bg-bg-base border border-border rounded-input pl-8 pr-3 py-1.5 text-[13px] text-text-secondary outline-none placeholder:text-border font-sans"
              placeholder="Search friends..."
              value={friendSearch}
              onChange={(e) => setFriendSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-[7px]">
            {filteredPeople.map((p) =>
              p.sinbin ? (
                <span key={p.id} className="text-[13px] font-medium px-3 py-[7px] rounded-chip border border-bad/30 text-bad opacity-45 cursor-not-allowed">
                  {p.name} 🚫
                </span>
              ) : (
                <span
                  key={p.id}
                  onClick={() => togglePerson(p.id)}
                  className={`text-[13px] font-medium px-3 py-[7px] rounded-chip border cursor-pointer transition-all ${
                    p.active
                      ? 'border-accent text-accent bg-accent/10'
                      : 'border-border text-text-dim hover:border-text-faint'
                  }`}
                >
                  {p.name}
                </span>
              )
            )}
          </div>
        </SectionCard>

        {/* Why */}
        <SectionCard label="Why?">
          <div className="flex gap-2.5 items-center">
            <VoiceButton />
            <input
              className="flex-1 bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-text-secondary outline-none placeholder:text-border font-sans"
              placeholder="Voice or type your reason..."
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>
        </SectionCard>

        {/* Send button */}
        <button
          onClick={() => canSend && setSent(true)}
          className={`w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
            canSend
              ? 'bg-accent text-accent-fg hover:opacity-90'
              : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          Send reco
        </button>

        {/* QR alternative */}
        <Link
          href="/send/qr"
          className="flex items-center justify-center gap-2 py-3 border border-border rounded-btn cursor-pointer text-[13px] font-semibold text-text-dim hover:border-text-faint transition-colors -mt-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            <path d="M14 14h1v1h-1zM17 14h1v1h-1zM14 17h1v1h-1zM17 17h3v3h-3z"/>
          </svg>
          Create QR code instead
        </Link>
      </div>
    </div>
  )
}

// ─── LinkRow helper ───────────────────────────────────────────────────────────

function LinkRowIcon({ type }: { type: string }) {
  if (type === 'pin') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  )
  if (type === 'instagram') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
  if (type === 'calendar') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
  if (type === 'spotify') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#1DB954">
      <circle cx="12" cy="12" r="12"/>
      <path d="M6 9.6C9.3 7.5 14.9 7.8 18 10l-.9 1.5C15 9.7 10.2 9.4 7.2 11.3L6 9.6zm-.5 3.3C9.8 10.3 16.6 10.7 20 13.5l-.9 1.4C16 12.3 9.9 12 6.7 14.3l-1.2-1.4zm1 3.2c3-2 8.1-1.7 11 .5l-.9 1.3c-2.5-1.9-7-2.1-9.6-.4l-.5-1.4z" fill="#0a1f0e"/>
    </svg>
  )
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
    </svg>
  )
}

function LinkRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 bg-bg-base border border-border rounded-input px-3 py-2.5 mb-[7px] last:mb-0">
      <div className="w-[26px] h-[26px] rounded-[7px] bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
        <LinkRowIcon type={icon} />
      </div>
      {children}
    </div>
  )
}
