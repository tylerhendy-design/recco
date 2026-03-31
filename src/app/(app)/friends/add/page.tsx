'use client'

import { useState, useEffect, useCallback } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { Avatar } from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { searchProfiles, sendFriendRequest, getConnectionStatus } from '@/lib/data/friends'

type SearchResult = {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  status: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'loading'
}

type DiscoverResult = {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  status: SearchResult['status']
}

export default function AddFriendsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

  // Contact discovery
  const [discovered, setDiscovered] = useState<DiscoverResult[]>([])
  const [discovering, setDiscovering] = useState(false)
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [discoveryDone, setDiscoveryDone] = useState(false)

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [])

  const search = useCallback(async (q: string, uid: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    const profiles = await searchProfiles(q, uid)

    // Fetch connection status for each result in parallel
    const withStatus = await Promise.all(
      profiles.map(async (p) => {
        const conn = await getConnectionStatus(uid, p.id)
        let status: SearchResult['status'] = 'none'
        if (conn) {
          if (conn.status === 'accepted') status = 'accepted'
          else if (conn.status === 'pending') {
            status = conn.requester_id === uid ? 'pending_sent' : 'pending_received'
          }
        }
        return { ...p, status }
      })
    )
    setResults(withStatus)
    setSearching(false)
  }, [])

  useEffect(() => {
    if (!userId) return
    const t = setTimeout(() => search(query, userId), 300)
    return () => clearTimeout(t)
  }, [query, userId, search])

  const [confirmPerson, setConfirmPerson] = useState<SearchResult | null>(null)

  async function handleAdd(person: SearchResult) {
    if (!userId) return
    setConfirmPerson(null)
    setResults((prev) => prev.map((r) => r.id === person.id ? { ...r, status: 'loading' } : r))
    const { error } = await sendFriendRequest(userId, person.id)
    if (error) {
      setResults((prev) => prev.map((r) => r.id === person.id ? { ...r, status: 'none' } : r))
      return
    }
    setResults((prev) => prev.map((r) => r.id === person.id ? { ...r, status: 'pending_sent' } : r))
  }

  async function copyInvite() {
    await navigator.clipboard.writeText('https://givemeareco.com')
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2000)
  }

  async function discoverFromEmails(emails: string[]) {
    if (!userId || emails.length === 0) return
    setDiscovering(true)
    try {
      const res = await fetch('/api/discover-friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, userId }),
      })
      const data = await res.json()
      if (data.matches?.length > 0) {
        // Check connection status for each match
        const withStatus = await Promise.all(
          data.matches.map(async (m: any) => {
            const conn = await getConnectionStatus(userId, m.id)
            let status: SearchResult['status'] = 'none'
            if (conn) {
              if (conn.status === 'accepted') status = 'accepted'
              else if (conn.status === 'pending') {
                status = conn.requester_id === userId ? 'pending_sent' : 'pending_received'
              }
            }
            return { ...m, status }
          })
        )
        setDiscovered(withStatus)
      }
    } catch {}
    setDiscovering(false)
    setDiscoveryDone(true)
  }

  async function handleContactPicker() {
    try {
      const contacts = await (navigator as any).contacts.select(['email'], { multiple: true })
      const emails = contacts.flatMap((c: any) => c.email ?? [])
      await discoverFromEmails(emails)
    } catch {
      // Contact Picker not available or cancelled — show email input fallback
      setShowEmailInput(true)
    }
  }

  function handleEmailSubmit() {
    const emails = emailInput
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'))
    discoverFromEmails(emails)
  }

  async function handleDiscoverAdd(person: DiscoverResult) {
    if (!userId) return
    setDiscovered(prev => prev.map(r => r.id === person.id ? { ...r, status: 'loading' } : r))
    const { error } = await sendFriendRequest(userId, person.id)
    if (error) {
      setDiscovered(prev => prev.map(r => r.id === person.id ? { ...r, status: 'none' } : r))
      return
    }
    setDiscovered(prev => prev.map(r => r.id === person.id ? { ...r, status: 'pending_sent' } : r))
  }

  const hasContactPicker = typeof window !== 'undefined' && 'contacts' in navigator

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="Add friends" closeHref="/friends" />

      <div className="flex-1 overflow-y-auto scrollbar-none pb-6">
        {/* Search */}
        <div className="px-6 pt-4 pb-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Search by username..."
            className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-white placeholder:text-[#444] outline-none focus:border-accent font-sans"
          />
        </div>

        {/* Search results */}
        {query.length >= 2 && (
          <div className="px-6 pt-2">
            {searching && (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
              </div>
            )}
            {!searching && results.length === 0 && (
              <p className="text-[13px] text-text-faint py-6 text-center">No one found for @{query}</p>
            )}
            {!searching && results.map((person) => (
              <div key={person.id} className="flex items-center justify-between py-3.5 border-b border-[#0e0e10]">
                <div className="flex items-center gap-3">
                  <Avatar name={person.display_name} size="md" />
                  <div>
                    <div className="text-[15px] font-medium text-white">{person.display_name}</div>
                    <div className="text-[12px] text-text-faint mt-0.5">@{person.username}</div>
                  </div>
                </div>
                <AddButton status={person.status} onAdd={() => setConfirmPerson(person)} />
              </div>
            ))}
          </div>
        )}

        {/* Find friends from contacts */}
        {!discoveryDone && (
          <div className="px-6 mt-5 border-t border-bg-card pt-5">
            <div className="text-[15px] font-semibold text-white mb-1">Find friends already on reco</div>
            <div className="text-[13px] text-text-muted leading-[1.6] mb-3">
              Check if people you know have already signed up.
            </div>

            {!showEmailInput ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleContactPicker}
                  disabled={discovering}
                  className="w-full py-3 bg-bg-card border border-border rounded-btn text-[14px] font-semibold text-white flex items-center justify-center gap-2 hover:border-accent/50 transition-colors"
                >
                  {discovering ? (
                    <><div className="w-3.5 h-3.5 border-2 border-border border-t-accent rounded-full animate-spin" /> Checking...</>
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> {hasContactPicker ? 'Check my contacts' : 'Find by email'}</>
                  )}
                </button>
                {!hasContactPicker && (
                  <button
                    onClick={() => setShowEmailInput(true)}
                    className="text-[12px] text-text-faint underline underline-offset-2"
                  >
                    Enter emails manually
                  </button>
                )}
              </div>
            ) : (
              <div>
                <textarea
                  autoFocus
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                  placeholder={"Paste email addresses here, one per line\ne.g.\nfriend@gmail.com\nmate@icloud.com"}
                  rows={1}
                  className="w-full bg-bg-card border border-border rounded-input px-3.5 py-3 text-[14px] text-text-secondary placeholder:text-[#444] outline-none focus:border-accent font-sans resize-none min-h-[44px] mb-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowEmailInput(false); setEmailInput('') }}
                    className="flex-1 py-2.5 border border-border rounded-btn text-[13px] font-semibold text-text-faint"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEmailSubmit}
                    disabled={discovering || !emailInput.trim()}
                    className={`flex-[2] py-2.5 rounded-btn text-[13px] font-bold ${emailInput.trim() ? 'bg-accent text-accent-fg' : 'bg-accent/30 text-accent-fg/50'}`}
                  >
                    {discovering ? 'Checking...' : 'Find friends'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Discovery results */}
        {discovered.length > 0 && (
          <div className="px-6 mt-4">
            <div className="text-[11px] font-semibold text-accent tracking-[0.5px] uppercase mb-3">
              {discovered.length} {discovered.length === 1 ? 'friend' : 'friends'} found
            </div>
            {discovered.map((person) => (
              <div key={person.id} className="flex items-center justify-between py-3.5 border-b border-[#0e0e10]">
                <div className="flex items-center gap-3">
                  <Avatar name={person.display_name} size="md" />
                  <div>
                    <div className="text-[15px] font-medium text-white">{person.display_name}</div>
                    <div className="text-[12px] text-text-faint mt-0.5">@{person.username}</div>
                  </div>
                </div>
                <AddButton status={person.status} onAdd={() => handleDiscoverAdd(person)} />
              </div>
            ))}
          </div>
        )}

        {discoveryDone && discovered.length === 0 && (
          <div className="px-6 mt-4 text-center">
            <div className="text-[13px] text-text-faint py-4">No matches found yet. Invite them to join.</div>
          </div>
        )}

        {/* Invite section */}
        <div className="px-6 mt-6 border-t border-bg-card pt-5">
          <div className="text-[15px] font-semibold text-white mb-1">Know someone who should be here?</div>
          <div className="text-[13px] text-text-muted leading-[1.6] mb-4">
            Recos are better with friends. Invite people you trust.
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: 'Join me on reco.', text: 'Your friends have recommendations for you.', url: 'https://givemeareco.com' }).catch(() => {})
                } else {
                  copyInvite()
                }
              }}
              className="flex-1 py-3.5 bg-accent text-accent-fg rounded-btn text-[14px] font-bold text-center"
            >
              Share invite
            </button>
            <button
              onClick={copyInvite}
              className="py-3.5 px-5 border border-border rounded-btn text-[13px] font-semibold text-text-muted hover:text-white transition-colors"
            >
              {inviteCopied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation overlay */}
      {confirmPerson && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm" onClick={() => setConfirmPerson(null)} />
          <div className="fixed inset-x-0 bottom-0 z-[201] p-4 pb-8">
            <div className="bg-bg-elevated border border-border rounded-2xl overflow-hidden shadow-2xl max-w-[390px] mx-auto px-5 py-5 text-center">
              <div className="w-14 h-14 rounded-full bg-bg-card border border-border flex items-center justify-center text-[16px] font-bold text-text-secondary overflow-hidden mx-auto mb-3">
                {confirmPerson.avatar_url
                  ? <img src={confirmPerson.avatar_url} alt="" className="w-full h-full object-cover" />
                  : initials(confirmPerson.display_name)
                }
              </div>
              <div className="text-[16px] font-bold text-white mb-1">Add {confirmPerson.display_name.split(' ')[0]}?</div>
              <div className="text-[13px] text-text-muted mb-4">They'll receive a friend request from you.</div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmPerson(null)} className="flex-1 py-3 border border-border rounded-btn text-[14px] font-semibold text-text-faint">Cancel</button>
                <button onClick={() => handleAdd(confirmPerson)} className="flex-[2] py-3 bg-accent text-accent-fg rounded-btn text-[14px] font-bold">Send request</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AddButton({ status, onAdd }: { status: SearchResult['status']; onAdd: () => void }) {
  if (status === 'accepted') {
    return <span className="text-[12px] text-text-faint font-medium">Friends</span>
  }
  if (status === 'pending_sent') {
    return <span className="text-[12px] text-text-faint font-medium">Requested</span>
  }
  if (status === 'pending_received') {
    return <span className="text-[12px] text-accent font-medium">Wants to add you</span>
  }
  if (status === 'loading') {
    return <div className="w-4 h-4 border-2 border-border border-t-accent rounded-full animate-spin" />
  }
  return (
    <button
      onClick={onAdd}
      className="px-3.5 py-[7px] border border-accent rounded-chip text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
    >
      Add
    </button>
  )
}
