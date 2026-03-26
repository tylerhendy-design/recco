'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { CategoryChip } from '@/components/ui/CategoryChip'
import { VoiceButton } from '@/components/ui/VoiceButton'
import { CATEGORIES, type CategoryId } from '@/constants/categories'
import { today } from '@/lib/utils'

const ALL_FRIENDS = [
  { id: 'u1', name: 'Sam Huckle', active: false, sinbin: false },
  { id: 'u2', name: 'Tyler Hendy', active: false, sinbin: false },
  { id: 'u3', name: 'Alex Horlock', active: false, sinbin: false },
  { id: 'u4', name: 'Mum', active: false, sinbin: false },
  { id: 'u5', name: 'Big Jimmy', active: false, sinbin: false },
  { id: 'u6', name: 'Mick Keane', active: false, sinbin: true },
]

interface ExtraPerson { id: string; name: string; contact: string; active: boolean }

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
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [people, setPeople] = useState(ALL_FRIENDS)
  const [extraPeople, setExtraPeople] = useState<ExtraPerson[]>([])
  const [friendSearch, setFriendSearch] = useState('')

  // New person inline form
  const [newName, setNewName] = useState('')
  const [newContact, setNewContact] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)

  // Bonus details
  const [bonusOpen, setBonusOpen] = useState(false)
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [links, setLinks] = useState<string[]>([''])

  const [sent, setSent] = useState(false)

  const catDef = CATEGORIES.find((c) => c.id === category)

  function togglePerson(id: string) {
    setPeople((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p))
  }

  function toggleExtra(id: string) {
    setExtraPeople((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p))
  }

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return people.filter((p) => !p.sinbin)
    return people.filter((p) => !p.sinbin && p.name.toLowerCase().includes(q))
  }, [friendSearch, people])

  const filteredExtra = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return extraPeople
    return extraPeople.filter((p) => p.name.toLowerCase().includes(q))
  }, [friendSearch, extraPeople])

  const noMatch = friendSearch.trim().length > 0 &&
    filteredFriends.length === 0 &&
    filteredExtra.length === 0

  const exactMatch = [...people, ...extraPeople].some(
    (p) => p.name.toLowerCase() === friendSearch.trim().toLowerCase()
  )
  const showAddOption = friendSearch.trim().length > 0 && !exactMatch && !showNewForm

  function startNewPerson() {
    setNewName(friendSearch.trim())
    setNewContact('')
    setShowNewForm(true)
  }

  function confirmNewPerson() {
    if (!newName.trim()) return
    const person: ExtraPerson = {
      id: `new-${Date.now()}`,
      name: newName.trim(),
      contact: newContact.trim(),
      active: true,
    }
    setExtraPeople((prev) => [...prev, person])
    setNewName('')
    setNewContact('')
    setShowNewForm(false)
    setFriendSearch('')
  }

  async function importFromContacts() {
    if (!('contacts' in navigator)) {
      // Not supported — open new person form instead
      setShowNewForm(true)
      return
    }
    try {
      const selected = await (navigator as any).contacts.select(
        ['name', 'tel', 'email'],
        { multiple: true }
      )
      const imported: ExtraPerson[] = selected
        .filter((c: any) => c.name?.[0])
        .map((c: any) => ({
          id: `contact-${Date.now()}-${Math.random()}`,
          name: c.name[0],
          contact: c.tel?.[0] ?? c.email?.[0] ?? '',
          active: true,
        }))
      setExtraPeople((prev) => [...prev, ...imported])
    } catch {
      // User dismissed
    }
  }

  const anyActive = people.some((p) => p.active) || extraPeople.some((p) => p.active)
  const canSend = title.trim().length > 0 && anyActive

  const activeNames = [
    ...people.filter((p) => p.active).map((p) => p.name),
    ...extraPeople.filter((p) => p.active).map((p) => p.name),
  ]

  const recentBadRecos = people
    .filter((p) => p.active && !p.sinbin)
    .flatMap((p) => p.name === 'Sam Huckle' ? [{ person: 'Huckle', title: 'Padella', score: 34 }] : [])

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
              Good luck — we hope {activeNames.length === 1 ? activeNames[0] : 'they'} like{activeNames.length === 1 ? 's' : ''} it.
            </div>
          </div>

          {/* Invite via text for non-RECO recipients */}
          {extraPeople.filter((p) => p.active && p.contact).map((p) => (
            <a
              key={p.id}
              href={`sms:${p.contact}?body=${encodeURIComponent(`Hey! I just sent you a reco for ${title} on RECO — check it out: https://givemeareco.com`)}`}
              className="w-full bg-bg-card border border-border py-3 rounded-btn text-[13px] font-semibold text-text-secondary text-center"
            >
              Text {p.name} the link
            </a>
          ))}

          {recentBadRecos.length > 0 && (
            <div className="w-full bg-bad/5 border border-bad/20 rounded-card px-4 py-3.5 text-left">
              <div className="text-[11px] font-semibold text-bad/80 uppercase tracking-[0.5px] mb-2">Heads up</div>
              <div className="text-[13px] text-text-secondary leading-[1.5]">
                You recently gave {recentBadRecos[0].person} a bad reco ({recentBadRecos[0].title}). One more and you&apos;re in the sin bin for this category.
              </div>
            </div>
          )}

          <Link href="/home" className="w-full bg-accent text-accent-fg py-4 rounded-btn text-[15px] font-bold text-center mt-2">
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

        {/* Name */}
        <SectionCard label="Name">
          <input
            autoFocus
            className="bg-transparent outline-none text-white font-sans text-[17px] font-normal w-full tracking-[-0.3px] placeholder:text-[#2a2a30]"
            placeholder="Name it…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </SectionCard>

        {/* Why */}
        <SectionCard label="Why?">
          <div className="flex gap-2.5 items-center">
            <VoiceButton />
            <input
              className="flex-1 bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-text-secondary outline-none placeholder:text-border font-sans"
              placeholder="Voice or type your reason…"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>
        </SectionCard>

        {/* To */}
        <SectionCard label="To">
          <div className="flex items-center gap-2 mb-3">
            {/* Search */}
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                className="w-full bg-bg-base border border-border rounded-input pl-8 pr-3 py-1.5 text-[13px] text-text-secondary outline-none placeholder:text-border font-sans"
                placeholder="Search friends…"
                value={friendSearch}
                onChange={(e) => { setFriendSearch(e.target.value); setShowNewForm(false) }}
              />
            </div>
            {/* Import contacts */}
            <button
              onClick={importFromContacts}
              className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold text-text-faint hover:text-accent transition-colors px-2 py-1.5 border border-border rounded-input"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              Contacts
            </button>
          </div>

          {/* Friend chips */}
          <div className="flex flex-wrap gap-[7px]">
            {filteredFriends.map((p) => (
              <span
                key={p.id}
                onClick={() => togglePerson(p.id)}
                className={`text-[13px] font-medium px-3 py-[7px] rounded-chip border cursor-pointer transition-all ${
                  p.active ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-dim hover:border-text-faint'
                }`}
              >
                {p.name}
              </span>
            ))}
            {filteredExtra.map((p) => (
              <span
                key={p.id}
                onClick={() => toggleExtra(p.id)}
                className={`text-[13px] font-medium px-3 py-[7px] rounded-chip border cursor-pointer transition-all ${
                  p.active ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-dim hover:border-text-faint'
                }`}
              >
                {p.name}
              </span>
            ))}

            {/* Add new person option */}
            {showAddOption && (
              <span
                onClick={startNewPerson}
                className="text-[13px] font-medium px-3 py-[7px] rounded-chip border border-dashed border-accent/40 text-accent/70 cursor-pointer hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
                </svg>
                Add &ldquo;{friendSearch.trim()}&rdquo;
              </span>
            )}
          </div>

          {/* Inline new person form */}
          {showNewForm && (
            <div className="mt-3 p-3 bg-bg-base border border-border rounded-card flex flex-col gap-2">
              <div className="text-[11px] font-semibold text-text-muted uppercase tracking-[0.4px]">New person</div>
              <input
                autoFocus
                className="w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-[13px] text-white outline-none placeholder:text-border font-sans"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <input
                className="w-full bg-bg-elevated border border-border rounded-input px-3 py-2 text-[13px] text-text-secondary outline-none placeholder:text-border font-sans"
                placeholder="Phone or email (to invite them)"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                inputMode="email"
              />
              <div className="flex gap-2 mt-1">
                <button onClick={() => setShowNewForm(false)} className="flex-1 py-2 border border-border rounded-input text-[12px] font-semibold text-text-dim">Cancel</button>
                <button onClick={confirmNewPerson} disabled={!newName.trim()} className={`flex-[2] py-2 rounded-input text-[12px] font-bold transition-all ${newName.trim() ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'}`}>Add</button>
              </div>
            </div>
          )}

          {anyActive && (
            <div className="mt-3 text-[12px] text-text-faint">
              Sending to {activeNames.length === 1 ? activeNames[0] : `${activeNames.length} people`}
            </div>
          )}
        </SectionCard>

        {/* Bonus details — collapsed by default */}
        <div className="bg-bg-card border border-border rounded-card overflow-hidden">
          <button
            onClick={() => setBonusOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:opacity-80 transition-opacity"
          >
            <span className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase">Links, pics &amp; details</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#777780" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-200 ${bonusOpen ? 'rotate-180' : ''}`}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {bonusOpen && (
            <div className="px-4 pb-5 flex flex-col gap-4 border-t border-border">

              {/* Category-specific fields */}
              {catDef && catDef.extraFields.length > 0 && (
                <div className="flex flex-col gap-2.5">
                  {catDef.extraFields.map((field) => {
                    if (field.type === 'image') return (
                      <div key={field.id}>
                        <div className="text-[11px] font-medium text-text-faint uppercase tracking-[0.4px] mb-1.5">{field.label}</div>
                        <label className="block cursor-pointer">
                          <input type="file" accept="image/*" capture="environment" className="sr-only" />
                          <div className="border-[1.5px] border-dashed border-border rounded-input p-4 text-center hover:border-accent/50 transition-colors">
                            <div className="flex flex-col items-center gap-1.5">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
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
                      <div key={field.id}>
                        <div className="text-[11px] font-medium text-text-faint uppercase tracking-[0.4px] mb-1.5">{field.label}</div>
                        <input className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-text-secondary outline-none font-sans" defaultValue={today()} />
                      </div>
                    )
                    return (
                      <div key={field.id}>
                        <div className="text-[11px] font-medium text-text-faint uppercase tracking-[0.4px] mb-1.5 flex items-center gap-2">
                          {field.label}
                          {field.sublabel && <span className="text-spotify text-[9px] font-normal normal-case tracking-normal">{field.sublabel}</span>}
                        </div>
                        <input className="w-full bg-bg-base border border-border rounded-input px-3 py-2 text-[13px] text-text-secondary outline-none placeholder:text-border font-sans" placeholder={field.placeholder} />
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Links */}
              <div>
                <div className="text-[11px] font-semibold text-text-muted tracking-[0.4px] uppercase mb-2">Links</div>
                <div className="flex flex-col gap-2">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 bg-bg-base border border-border rounded-input px-3 py-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                        </svg>
                        <input
                          className="flex-1 bg-transparent outline-none text-[13px] text-text-secondary placeholder:text-border font-sans"
                          placeholder="Paste a URL…"
                          value={link}
                          onChange={(e) => { const n = [...links]; n[i] = e.target.value; setLinks(n) }}
                        />
                      </div>
                      {links.length > 1 && (
                        <button onClick={() => setLinks(links.filter((_, j) => j !== i))} className="w-7 h-7 flex items-center justify-center rounded-full text-text-faint hover:text-bad transition-colors flex-shrink-0">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setLinks([...links, ''])} className="flex items-center gap-1.5 text-[12px] font-semibold text-text-dim hover:text-text-secondary transition-colors mt-0.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add another link
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Send */}
        <button
          onClick={() => canSend && setSent(true)}
          className={`w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
            canSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          Send reco
        </button>

        <Link
          href="/send/qr"
          className="flex items-center justify-center gap-2 py-3 border border-border rounded-btn text-[13px] font-semibold text-text-dim hover:border-text-faint transition-colors -mt-2"
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
