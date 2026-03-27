'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { CategoryChip } from '@/components/ui/CategoryChip'
import { VoiceButton } from '@/components/ui/VoiceButton'
import { CATEGORIES, type CategoryId } from '@/constants/categories'
import { createClient } from '@/lib/supabase/client'
import { fetchFriends } from '@/lib/data/friends'
import { sendReco } from '@/lib/data/recos'

interface Friend {
  id: string
  name: string
  username: string
  avatar_url: string | null
  active: boolean
}

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

export default function GivePage() {
  return (
    <Suspense>
      <GivePageInner />
    </Suspense>
  )
}

function GivePageInner() {
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('to')

  const [userId, setUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<Friend[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)

  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [extraPeople, setExtraPeople] = useState<ExtraPerson[]>([])
  const [friendSearch, setFriendSearch] = useState('')

  const [newName, setNewName] = useState('')
  const [newContact, setNewContact] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)

  const [bonusOpen, setBonusOpen] = useState(false)
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [links, setLinks] = useState<string[]>([''])

  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const fetched = await fetchFriends(user.id)
      setFriends(
        fetched.map((f: any) => ({
          id: f.id,
          name: f.display_name,
          username: f.username,
          avatar_url: f.avatar_url,
          active: f.id === preselectedId,
        }))
      )
      setLoadingFriends(false)
    })
  }, [preselectedId])

  function toggleFriend(id: string) {
    setFriends((prev) => prev.map((f) => f.id === id ? { ...f, active: !f.active } : f))
  }

  function toggleExtra(id: string) {
    setExtraPeople((prev) => prev.map((p) => p.id === id ? { ...p, active: !p.active } : p))
  }

  const filteredFriends = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return friends
    return friends.filter((f) => f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q))
  }, [friendSearch, friends])

  const filteredExtra = useMemo(() => {
    const q = friendSearch.trim().toLowerCase()
    if (!q) return extraPeople
    return extraPeople.filter((p) => p.name.toLowerCase().includes(q))
  }, [friendSearch, extraPeople])

  const exactMatch = [...friends, ...extraPeople].some(
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
    setExtraPeople((prev) => [...prev, {
      id: `new-${Date.now()}`,
      name: newName.trim(),
      contact: newContact.trim(),
      active: true,
    }])
    setNewName('')
    setNewContact('')
    setShowNewForm(false)
    setFriendSearch('')
  }

  async function importFromContacts() {
    if (!('contacts' in navigator)) { setShowNewForm(true); return }
    try {
      const selected = await (navigator as any).contacts.select(['name', 'tel', 'email'], { multiple: true })
      const imported: ExtraPerson[] = selected
        .filter((c: any) => c.name?.[0])
        .map((c: any) => ({
          id: `contact-${Date.now()}-${Math.random()}`,
          name: c.name[0],
          contact: c.tel?.[0] ?? c.email?.[0] ?? '',
          active: true,
        }))
      setExtraPeople((prev) => [...prev, ...imported])
    } catch {}
  }

  const activeFriends = friends.filter((f) => f.active)
  const activeExtra = extraPeople.filter((p) => p.active)
  const anyActive = activeFriends.length > 0 || activeExtra.length > 0
  const canSend = title.trim().length > 0 && anyActive && category !== null && !sending

  const activeNames = [
    ...activeFriends.map((f) => f.name),
    ...activeExtra.map((p) => p.name),
  ]

  async function handleSend() {
    if (!canSend || !userId || !category) return
    setSending(true)
    setSendError(null)

    const recipientIds = activeFriends.map((f) => f.id)
    const finalCat = category === 'custom' ? 'custom' : category
    const finalCustomCat = category === 'custom' ? customCat.trim() : undefined

    const { error } = await sendReco({
      senderId: userId,
      category: finalCat,
      customCat: finalCustomCat,
      title: title.trim(),
      whyText: why.trim() || undefined,
      links: links.filter((l) => l.trim()),
      recipientIds,
    })

    if (error) {
      setSendError(error)
      setSending(false)
      return
    }

    setSent(true)
  }

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
              Reco given. Good job.
            </div>
            <div className="text-[15px] text-text-dim leading-[1.6]">
              We hope {activeNames.length === 1 ? activeNames[0] : 'they'} love{activeNames.length === 1 ? 's' : ''} it.
            </div>
          </div>

          {activeExtra.filter((p) => p.contact).map((p) => (
            <a
              key={p.id}
              href={`sms:${p.contact}?body=${encodeURIComponent(`Hey! I just gave you a reco for ${title} on Reco — check it out: https://givemeareco.com`)}`}
              className="w-full bg-bg-card border border-border py-3 rounded-btn text-[13px] font-semibold text-text-secondary text-center"
            >
              Text {p.name} the link
            </a>
          ))}

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
                onClick={() => setCategory(cat.id === category ? null : cat.id as CategoryId)}
              />
            ))}
          </div>
          {category === 'custom' && (
            <input
              value={customCat}
              onChange={(e) => setCustomCat(e.target.value)}
              placeholder="Category name…"
              className="w-full mt-3 bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-white placeholder:text-text-faint outline-none focus:border-accent"
            />
          )}
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
          <div className="flex gap-2.5 items-start">
            <VoiceButton />
            <textarea
              className="flex-1 bg-bg-base border border-border rounded-input px-3 py-2 text-[14px] text-text-secondary outline-none placeholder:text-border font-sans resize-none"
              placeholder="Voice or type your reason…"
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
            />
          </div>
        </SectionCard>

        {/* To */}
        <SectionCard label="To">
          <div className="flex items-center gap-2 mb-3">
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

          {loadingFriends ? (
            <div className="flex justify-center py-3">
              <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex flex-wrap gap-[7px]">
              {filteredFriends.map((f) => (
                <span
                  key={f.id}
                  onClick={() => toggleFriend(f.id)}
                  className={`text-[13px] font-medium px-3 py-[7px] rounded-chip border cursor-pointer transition-all ${
                    f.active ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-dim hover:border-text-faint'
                  }`}
                >
                  {f.name}
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
          )}

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
              Giving to {activeNames.length === 1 ? activeNames[0] : `${activeNames.length} people`}
            </div>
          )}
        </SectionCard>

        {/* Bonus details */}
        <div className="bg-bg-card border border-border rounded-card">
          <button
            onClick={() => setBonusOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 active:opacity-60 transition-opacity"
          >
            <span className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase">
              Links &amp; details
              <span className="ml-1.5 normal-case font-normal text-[11px] text-text-faint">optional</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#777780" strokeWidth="2.5" strokeLinecap="round" className={`transition-transform duration-200 flex-shrink-0 ${bonusOpen ? 'rotate-180' : ''}`}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {bonusOpen && (
            <div className="flex flex-col gap-4 border-t border-border px-4 pt-4 pb-5">
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

        {sendError && (
          <div className="text-[13px] text-red-400 text-center">{sendError}</div>
        )}

        {/* Send */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`w-full py-[15px] rounded-btn text-[15px] font-bold transition-all ${
            canSend ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-accent/30 text-accent-fg/50 cursor-not-allowed'
          }`}
        >
          {sending ? 'Giving…' : 'Give reco'}
        </button>

      </div>
    </div>
  )
}
