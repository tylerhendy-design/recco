'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { Avatar } from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import { fetchFriends, fetchIncomingRequests, acceptFriendRequest, declineFriendRequest } from '@/lib/data/friends'
import { initials } from '@/lib/utils'

type FriendRow = {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  tier: string
  connection_id: string
}

type RequestRow = {
  id: string
  display_name: string
  username: string
  avatar_url: string | null
  connection_id: string
}

export default function FriendsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const [f, r] = await Promise.all([
        fetchFriends(user.id),
        fetchIncomingRequests(user.id),
      ])
      setFriends(f as FriendRow[])
      setRequests(r as RequestRow[])
      setLoading(false)
    })
  }, [])

  async function handleAccept(req: RequestRow) {
    if (!userId) return
    setRequests((prev) => prev.filter((r) => r.id !== req.id))
    await acceptFriendRequest(req.connection_id, req.id, userId)
    // Refresh friends list
    const updated = await fetchFriends(userId)
    setFriends(updated as FriendRow[])
  }

  async function handleDecline(req: RequestRow) {
    setRequests((prev) => prev.filter((r) => r.id !== req.id))
    await declineFriendRequest(req.connection_id)
  }

  const filtered = friends.filter((f) =>
    f.display_name.toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader
        title="Friends"
        rightAction={
          <span className="text-[13px] font-medium text-text-faint px-3 py-1.5 border border-border rounded-chip">
            {friends.length} / 150
          </span>
        }
      />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mx-6 mt-2.5 px-3.5 py-[11px] bg-bg-card border border-border rounded-input text-sm text-white font-sans outline-none placeholder:text-text-faint"
        placeholder="Search friends..."
      />

      <div className="flex-1 overflow-y-auto scrollbar-none">

        {/* Incoming requests */}
        {requests.length > 0 && (
          <div className="px-6 pt-4 pb-2">
            <div className="text-[11px] font-semibold text-accent tracking-[0.5px] uppercase mb-3">
              Friend requests
            </div>
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-3 border-b border-[#0e0e10]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center text-[11px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                    {req.avatar_url
                      ? <img src={req.avatar_url} alt={req.display_name} className="w-full h-full object-cover" />
                      : initials(req.display_name)
                    }
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-white">{req.display_name}</div>
                    <div className="text-[12px] text-text-faint">@{req.username}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDecline(req)}
                    className="px-3 py-1.5 rounded-chip border border-border text-[12px] text-text-faint hover:border-red-400 hover:text-red-400 transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(req)}
                    className="px-3 py-1.5 rounded-chip border border-accent text-[12px] text-accent font-semibold hover:bg-accent/10 transition-colors"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 && requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-3">
            <div className="text-[36px] mb-1">👋</div>
            <div className="text-[16px] font-semibold text-white">No friends yet</div>
            <div className="text-[13px] text-text-muted leading-[1.6]">
              Search for people you know or share your invite link.
            </div>
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <div className="px-6 pt-4 pb-1">
                <div className="text-[11px] font-semibold text-text-faint tracking-[0.5px] uppercase mb-1">
                  {filtered.length} {filtered.length === 1 ? 'friend' : 'friends'}
                </div>
              </div>
            )}
            {filtered.map((friend) => (
              <Link key={friend.id} href={`/friends/${friend.id}`}>
                <div className="flex items-center gap-3 px-6 py-3.5 border-b border-[#0e0e10] hover:bg-bg-card transition-colors">
                  <div className="w-10 h-10 rounded-full bg-bg-card border border-border flex items-center justify-center text-[12px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                    {friend.avatar_url
                      ? <img src={friend.avatar_url} alt={friend.display_name} className="w-full h-full object-cover" />
                      : initials(friend.display_name)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-medium text-white">{friend.display_name}</div>
                    <div className="text-[12px] text-text-faint">@{friend.username}</div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </>
        )}

        {/* Add friend button */}
        <div className="flex justify-center py-6">
          <Link
            href="/friends/add"
            className="w-12 h-12 rounded-full border-[1.5px] border-border bg-bg-base flex items-center justify-center hover:border-accent transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="8" r="4"/>
              <path d="M20 21a8 8 0 00-16 0"/>
              <line x1="19" y1="8" x2="19" y2="14"/>
              <line x1="16" y1="11" x2="22" y2="11"/>
            </svg>
          </Link>
        </div>

      </div>
    </div>
  )
}
