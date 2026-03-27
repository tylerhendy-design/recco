'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { createClient } from '@/lib/supabase/client'
import { fetchFriendProfile, removeFriend } from '@/lib/data/friends'
import { fetchUserPicks, type Pick } from '@/lib/data/picks'
import { initials } from '@/lib/utils'
import { getCategoryColor, getCategoryLabel } from '@/constants/categories'

export default function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ display_name: string; username: string; avatar_url: string | null; joined_at: string } | null>(null)
  const [stats, setStats] = useState({ recos_sent: 0, friends_count: 0, recos_completed: 0, stinkers_sent: 0 })
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      const [{ profile: prof, stats: s }, p] = await Promise.all([
        fetchFriendProfile(id),
        fetchUserPicks(id),
      ])
      if (prof) setProfile(prof)
      setStats(s)
      setPicks(p)
      setLoading(false)
    })
  }, [id])

  async function handleRemoveFriend() {
    if (!currentUserId || !confirm(`Remove ${profile?.display_name} as a friend?`)) return
    setRemoving(true)
    await removeFriend(currentUserId, id)
    router.replace('/friends')
  }

  const joinYear = profile?.joined_at ? new Date(profile.joined_at).getFullYear() : null

  // Group picks by category
  const picksByCategory = picks.reduce<Record<string, Pick[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader
        title={loading ? '…' : (profile?.display_name.split(' ')[0].toLowerCase() ?? 'friend')}
        closeHref="/friends"
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : !profile ? (
        <div className="flex-1 flex items-center justify-center text-text-faint text-sm">
          User not found.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-none pb-8">

          {/* Avatar + name */}
          <div className="px-6 pt-5 pb-5 border-b border-bg-card">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-bg-card border border-border flex items-center justify-center text-[20px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
                  : initials(profile.display_name)
                }
              </div>
              <div>
                <div className="text-[20px] font-bold text-white tracking-[-0.4px]">{profile.display_name}</div>
                <div className="text-[13px] text-text-faint mt-0.5">
                  @{profile.username}{joinYear ? ` · joined ${joinYear}` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="px-6 py-5 border-b border-bg-card">
            <div className="flex gap-2.5 mb-2.5">
              <StatBox value={String(stats.recos_sent)} label="Recos sent" />
              <StatBox value={String(stats.friends_count)} label="Friends" />
            </div>
            <div className="flex gap-2.5">
              <StatBox value={String(stats.recos_completed)} label="Completed" />
              <StatBox value={String(stats.stinkers_sent)} label="Stinkers sent" danger />
            </div>
          </div>

          {/* Picks */}
          <div className="px-6 pt-5">
            <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-text-faint mb-4">
              I'd recommend to anyone
            </div>

            {picks.length === 0 ? (
              <p className="text-[13px] text-text-faint leading-[1.5]">
                {profile.display_name.split(' ')[0]} hasn't added any picks yet.
              </p>
            ) : (
              Object.entries(picksByCategory).map(([category, items]) => {
                const color = getCategoryColor(category)
                const isOpen = expanded[category] ?? false
                return (
                  <div key={category} className="border border-border rounded-card overflow-hidden mb-2">
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-card transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="text-[13px] font-semibold text-white">{getCategoryLabel(category)}</span>
                        <span className="text-[11px] text-text-faint">{items.length}</span>
                      </div>
                      <svg
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#6e6e78" strokeWidth="2" strokeLinecap="round"
                        className={`transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="border-t border-border">
                        {items.map((pick) => (
                          <div key={pick.id} className="px-4 py-3 border-b border-[#0e0e10] last:border-0">
                            <div className="text-[14px] font-medium text-white">{pick.title}</div>
                            {pick.why && <div className="text-[12px] text-text-muted mt-0.5 leading-[1.5]">{pick.why}</div>}
                            {pick.links.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-1.5">
                                {pick.links.map((link, i) => (
                                  <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent underline underline-offset-2 truncate">{link}</a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Remove friend */}
          <div className="px-6 pt-8">
            <button
              onClick={handleRemoveFriend}
              disabled={removing}
              className="w-full py-4 rounded-btn border border-border text-[15px] font-semibold text-red-400 hover:border-red-400 transition-colors disabled:opacity-40"
            >
              {removing ? 'Removing…' : 'Remove friend'}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}

function StatBox({ value, label, danger }: { value: string; label: string; danger?: boolean }) {
  return (
    <div className="flex-1 bg-bg-card rounded-input p-2.5 text-center">
      <div className={`text-[20px] font-bold ${danger ? 'text-red-400' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-text-faint mt-0.5">{label}</div>
    </div>
  )
}
