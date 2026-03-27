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

export default function AddFriendsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)

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

  async function handleAdd(person: SearchResult) {
    if (!userId) return
    setResults((prev) => prev.map((r) => r.id === person.id ? { ...r, status: 'loading' } : r))
    const { error } = await sendFriendRequest(userId, person.id)
    if (error) {
      alert(`Failed to send request: ${error}`)
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
            className="w-full bg-bg-card border border-border rounded-input px-4 py-3.5 text-[15px] text-white placeholder:text-text-faint focus:outline-none focus:border-accent"
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
                <AddButton status={person.status} onAdd={() => handleAdd(person)} />
              </div>
            ))}
          </div>
        )}

        {/* Invite section */}
        <div className="px-6 mt-6 border-t border-bg-card pt-5">
          <div className="text-[11px] font-semibold text-text-faint tracking-[0.6px] uppercase mb-2">
            Invite someone
          </div>
          <div className="text-[13px] text-text-dim leading-[1.6] mb-3">
            Send a link to someone not on Reco yet.
          </div>
          <button
            onClick={copyInvite}
            className="w-full border border-border rounded-btn p-3.5 text-center text-[13px] font-semibold text-accent hover:bg-accent/5 transition-colors"
          >
            {inviteCopied ? 'Link copied!' : 'Copy invite link'}
          </button>
        </div>
      </div>
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
