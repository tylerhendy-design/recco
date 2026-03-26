'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { FilterScroll } from '@/components/ui/FilterScroll'
import { PersonRow } from '@/components/ui/PersonRow'
import { SinBinSheet } from '@/components/overlays/SinBinSheet'
import type { Friend } from '@/types/app.types'

const SEED_FRIENDS: Friend[] = [
  {
    id: 'u5',
    display_name: 'Big Jimmy',
    username: 'bigjimmy',
    avatar_url: null,
    tier: 'close',
    taste_alignment: 94,
    taste_by_category: [{ category: 'restaurant', score: 94, heart_count: 3, is_mismatch: false }],
    is_sinbinned: false,
  },
  {
    id: 'u1',
    display_name: 'Sam Huckle',
    username: 'samhuckle',
    avatar_url: null,
    tier: 'close',
    taste_alignment: 78,
    taste_by_category: [
      { category: 'tv', score: 78, heart_count: 1, is_mismatch: false },
      { category: 'film', score: 70, heart_count: 1, is_mismatch: false },
      { category: 'restaurant', score: 30, heart_count: 0, is_mismatch: true },
    ],
    is_sinbinned: false,
  },
  {
    id: 'u2',
    display_name: 'Tyler Hendy',
    username: 'tylerhendy',
    avatar_url: null,
    tier: 'close',
    taste_alignment: 71,
    taste_by_category: [
      { category: 'restaurant', score: 71, heart_count: 1, is_mismatch: false },
      { category: 'tv', score: 65, heart_count: 1, is_mismatch: false },
    ],
    is_sinbinned: false,
  },
  {
    id: 'u3',
    display_name: 'Alex Horlock',
    username: 'horlock',
    avatar_url: null,
    tier: 'clan',
    taste_alignment: 54,
    taste_by_category: [
      { category: 'podcast', score: 70, heart_count: 1, is_mismatch: false },
      { category: 'film', score: 20, heart_count: 0, is_mismatch: true },
    ],
    is_sinbinned: false,
  },
  {
    id: 'u6',
    display_name: 'Mick Keane',
    username: 'mick',
    avatar_url: null,
    tier: 'sinbin' as any,
    taste_alignment: 10,
    taste_by_category: [],
    is_sinbinned: true,
    sinbin_category: 'film',
    sinbin_count: 3,
  },
  {
    id: 'u7',
    display_name: 'Mum',
    username: 'mum',
    avatar_url: null,
    tier: 'tribe',
    taste_alignment: 32,
    taste_by_category: [],
    is_sinbinned: false,
  },
]

const TIER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'close', label: 'Close friends' },
  { value: 'clan', label: 'Clan' },
  { value: 'tribe', label: 'Tribe' },
  { value: 'sinbin', label: 'Sin bin' },
]

const TIER_INFO: Record<string, { title: string; body: string }> = {
  all: { title: 'All friends', body: '142 people across all groups. Each tier changes how much weight their recos carry.' },
  close: { title: 'Close friends — up to 15', body: 'Your inner circle. Their recos carry the most weight and appear first.' },
  clan: { title: 'Clan — up to 50', body: "Good friends whose taste you generally trust. Recos land with context." },
  tribe: { title: 'Tribe — up to 150', body: 'Your broader network. Recos are surfaced but weighted less.' },
  sinbin: { title: 'Sin bin', body: 'People blocked from a category after 3 bad recos in a row.' },
}

export default function FriendsPage() {
  const [tierFilter, setTierFilter] = useState('all')
  const [sinbinFriend, setSinbinFriend] = useState<Friend | null>(null)
  const [friends, setFriends] = useState(SEED_FRIENDS)

  function releaseFriend(id: string) {
    setFriends((prev) => prev.map((f) =>
      f.id === id ? { ...f, is_sinbinned: false, tier: 'clan' as any } : f
    ))
    setSinbinFriend(null)
  }

  const filtered = friends.filter((f) => {
    if (tierFilter === 'all') return true
    if (tierFilter === 'sinbin') return f.is_sinbinned
    return f.tier === tierFilter && !f.is_sinbinned
  })

  const info = TIER_INFO[tierFilter] ?? TIER_INFO.all

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
      <StatusBar />
      <NavHeader
        title="friends"
        rightAction={
          <span className="text-[13px] font-medium text-text-faint px-3 py-1.5 border border-border rounded-chip">
            142 / 150
          </span>
        }
      />

      <input
        className="mx-6 mt-2.5 px-3.5 py-[11px] bg-bg-card border border-border rounded-input text-sm text-white font-sans outline-none placeholder:text-text-faint"
        placeholder="Search friends..."
      />

      <FilterScroll
        options={TIER_FILTERS}
        selected={tierFilter}
        onSelect={setTierFilter}
      />

      {/* Tier description */}
      <div className="px-6 py-2.5 bg-[#0e0e10] border-b border-bg-card flex-shrink-0">
        <div className="text-[11px] font-semibold text-accent mb-0.5">{info.title}</div>
        <div className="text-[11px] text-text-faint leading-[1.5]">{info.body}</div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none relative">
        {filtered.map((friend) =>
          friend.is_sinbinned ? (
            <PersonRow
              key={friend.id}
              friend={friend}
              onClick={() => setSinbinFriend(friend)}
              style={undefined}
            />
          ) : (
            <Link key={friend.id} href={`/friends/${friend.id}`}>
              <PersonRow
                friend={friend}
                style={friend.tier === 'close' ? { borderLeft: '2px solid #D4E23A' } : undefined}
              />
            </Link>
          )
        )}

        {/* Add button — hidden on sin bin filter */}
        {tierFilter !== 'sinbin' && (
          <div className="flex justify-center py-5 pb-2">
            <Link
              href="/friends/add"
              className="w-12 h-12 rounded-full border-[1.5px] border-border bg-bg-base flex items-center justify-center cursor-pointer hover:border-accent transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4E23A" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M20 21a8 8 0 00-16 0"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="16" y1="11" x2="22" y2="11"/>
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Sin bin sheet */}
      {sinbinFriend && (
        <SinBinSheet
          open={!!sinbinFriend}
          onClose={() => setSinbinFriend(null)}
          onRelease={() => sinbinFriend && releaseFriend(sinbinFriend.id)}
          friendName={sinbinFriend.display_name}
          category={sinbinFriend.sinbin_category ?? 'film'}
          offendingRecos={[
            { title: 'Tenet', score: 10 },
            { title: 'The Northman', score: 20 },
            { title: 'Babylon', score: 15 },
          ]}
        />
      )}
    </div>
  )
}
