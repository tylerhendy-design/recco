'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { createClient } from '@/lib/supabase/client'
import { fetchFriendProfile, fetchFriendsList, removeFriend } from '@/lib/data/friends'
import { fetchUserPicks, type Pick } from '@/lib/data/picks'
import { fetchBlockedCategories, fetchSinBinnedByFriend, fetchSinBinOffences, fetchFriendInMySinBin, releaseSinBin, type SinBinEntry } from '@/lib/data/sinbin'
import { initials } from '@/lib/utils'
import { getCategoryColor, getCategoryLabel } from '@/constants/categories'

function getLinkLabel(url: string): string {
  try {
    const u = new URL(url)
    const h = u.hostname.replace('www.', '')
    if (h.includes('instagram.com')) return 'Instagram'
    if (h.includes('twitter.com') || h.includes('x.com')) return 'X / Twitter'
    if (h.includes('google.com') && u.pathname.includes('maps')) return 'Google Maps'
    if (h.includes('maps.google.com') || h.includes('goo.gl')) return 'Google Maps'
    if (h.includes('maps.apple.com')) return 'Apple Maps'
    if (h.includes('spotify.com')) return 'Spotify'
    if (h.includes('youtube.com') || h.includes('youtu.be')) return 'YouTube'
    if (h.includes('facebook.com')) return 'Facebook'
    if (h.includes('tiktok.com')) return 'TikTok'
    if (h.includes('tripadvisor.com')) return 'TripAdvisor'
    if (h.includes('yelp.com')) return 'Yelp'
    if (h.includes('opentable.com')) return 'OpenTable'
    if (h.includes('resy.com')) return 'Resy'
    if (h.includes('imdb.com')) return 'IMDb'
    if (h.includes('netflix.com')) return 'Netflix'
    if (h.includes('goodreads.com')) return 'Goodreads'
    if (h.includes('amazon.')) return 'Amazon'
    if (h.includes('apple.com')) return 'Apple'
    return 'Website'
  } catch {
    return 'Link'
  }
}

export default function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ display_name: string; username: string; avatar_url: string | null; joined_at: string } | null>(null)
  const [stats, setStats] = useState({ recos_sent: 0, friends_count: 0, recos_completed: 0, stinkers_sent: 0 })
  const [friendsList, setFriendsList] = useState<{ id: string; display_name: string; username: string; avatar_url: string | null }[]>([])
  const [showFriends, setShowFriends] = useState(false)
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(false)
  const [memberNumber, setMemberNumber] = useState<number | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [blockedCategories, setBlockedCategories] = useState<string[]>([])
  const [sinBinnedByFriend, setSinBinnedByFriend] = useState<(SinBinEntry & { offences: string[] })[]>([])
  const [friendInMySinBin, setFriendInMySinBin] = useState<SinBinEntry[]>([])

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setCurrentUserId(user.id)
      const [{ profile: prof, stats: s, memberNumber: mn }, p, fl, blocked, sinBinned, inMySinBin] = await Promise.all([
        fetchFriendProfile(id),
        fetchUserPicks(id),
        fetchFriendsList(id),
        fetchBlockedCategories(user.id, id),
        fetchSinBinnedByFriend(user.id, id),
        fetchFriendInMySinBin(user.id, id),
      ])
      if (prof) setProfile(prof)
      setStats({ ...s, friends_count: fl.length })
      setFriendsList(fl)
      setMemberNumber(mn)
      setPicks(p)
      setBlockedCategories(blocked)

      // Fetch offences for each sin bin entry
      const sinBinnedWithOffences = await Promise.all(
        sinBinned.map(async (entry) => ({
          ...entry,
          offences: await fetchSinBinOffences(user.id, id, entry.category),
        }))
      )
      setSinBinnedByFriend(sinBinnedWithOffences)
      setFriendInMySinBin(inMySinBin)
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

  const picksByCategory = picks.reduce<Record<string, Pick[]>>((acc, p) => {
    const city = p.location ? p.location.split(',')[0].trim() : null
    const key = city ? `${p.category}||${city}` : p.category
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  return (
    <div className="flex flex-col flex-1 overflow-hidden relative">
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
                  @{profile.username}{memberNumber ? ` · #${memberNumber}` : ''}{joinYear ? ` · joined ${joinYear}` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Give / Get buttons */}
          <div className="px-6 py-4 border-b border-bg-card flex gap-3">
            <Link
              href={`/send?to=${id}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-btn bg-bg-card border border-border hover:border-accent/50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="#6e6e78">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
              <span className="text-[14px] font-semibold text-text-secondary">Give reco</span>
            </Link>
            <Link
              href={`/get?from=${id}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-btn bg-bg-card border border-border hover:border-accent/50 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" stroke="#6e6e78">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <span className="text-[14px] font-semibold text-text-secondary">Get reco</span>
            </Link>
          </div>

          {/* Sin bin status — if I'm in their sin bin */}
          {sinBinnedByFriend.length > 0 && (
            <div className="mx-4 mt-4 rounded-card border border-bad/30 bg-bad/5 overflow-hidden">
              {sinBinnedByFriend.map((entry) => (
                <div key={entry.category} className="px-4 py-3 border-b border-bad/10 last:border-0">
                  <div className="text-[11px] font-semibold text-bad tracking-[0.6px] uppercase mb-1">Sin bin</div>
                  <div className="text-[13px] text-white leading-[1.5]">
                    You're in {profile?.display_name.split(' ')[0]}'s sin bin. You gave them{' '}
                    <span className="font-semibold">{entry.bad_count} stinkers which were {getCategoryLabel(entry.category).toLowerCase()}</span>.
                  </div>
                  {entry.offences.length > 0 && (
                    <div className="text-[12px] text-bad/80 mt-1">
                      {entry.offences.join(', ')}.
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Friend is in MY sin bin — show release option */}
          {friendInMySinBin.length > 0 && (
            <div className="mx-4 mt-4 rounded-card border border-accent/30 bg-accent/5 overflow-hidden">
              {friendInMySinBin.map((entry) => (
                <div key={entry.category} className="px-4 py-3 border-b border-accent/10 last:border-0">
                  <div className="text-[11px] font-semibold text-accent tracking-[0.6px] uppercase mb-1">In your sin bin</div>
                  <div className="text-[13px] text-white leading-[1.5] mb-2.5">
                    {profile?.display_name.split(' ')[0]} is in your sin bin. They gave you{' '}
                    <span className="font-semibold">{entry.bad_count} stinkers which were {getCategoryLabel(entry.category).toLowerCase()}</span>.
                  </div>
                  <button
                    onClick={async () => {
                      if (!currentUserId) return
                      await releaseSinBin(id, currentUserId, entry.category)
                      setFriendInMySinBin((prev) => prev.filter((e) => e.category !== entry.category))
                    }}
                    className="px-3 py-1.5 rounded-chip border border-accent text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
                  >
                    Release from sin bin
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="px-6 py-5 border-b border-bg-card">
            <div className="flex gap-2.5 mb-2.5">
              <StatBox value={String(stats.recos_sent)} label="Recos given" />
              <StatBox value={String(stats.recos_completed)} label="Completed" />
            </div>
            <div className="flex gap-2.5">
              <StatBox value={String(stats.stinkers_sent)} label="Stinkers" danger />
              <StatBox value={String(stats.friends_count)} label="Friends" onPress={() => setShowFriends(true)} />
            </div>
          </div>

          {/* Picks */}
          <div className="px-6 pt-5">
            <h1 className="text-[20px] font-bold text-white tracking-[-0.4px] mb-4">
              I'd recommend to anyone
            </h1>

            {picks.length === 0 ? (
              <p className="text-[13px] text-text-faint leading-[1.5]">
                {profile.display_name.split(' ')[0]} hasn't added any picks yet.
              </p>
            ) : (
              Object.entries(picksByCategory).map(([key, items]) => {
                const [category] = key.split('||')
                const color = getCategoryColor(category)
                const isOpen = expanded[key] ?? false
                const byCityMap = items.reduce<Record<string, Pick[]>>((acc, p) => {
                  const city = p.location ? p.location.split(',')[0].trim() : ''
                  const k = city || '__none__'
                  if (!acc[k]) acc[k] = []
                  acc[k].push(p)
                  return acc
                }, {})
                const hasCities = Object.keys(byCityMap).some((k) => k !== '__none__')
                return (
                  <div key={key} className="border border-border rounded-card overflow-hidden mb-2">
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
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
                        {hasCities
                          ? Object.entries(byCityMap).map(([cityKey, cityPicks]) => (
                              <div key={cityKey}>
                                {cityKey !== '__none__' && (
                                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-text-faint tracking-[0.6px] uppercase border-b border-[#0e0e10]">
                                    {cityKey}
                                  </div>
                                )}
                                {cityPicks.map((pick) => (
                                  <div key={pick.id} className="px-4 py-3 border-b border-[#0e0e10] last:border-0">
                                    <div className="text-[14px] font-medium text-white">{pick.title}</div>
                                    {pick.why && <div className="text-[12px] text-text-muted mt-0.5 leading-[1.5]">{pick.why}</div>}
                                    {pick.links.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {pick.links.map((link, i) => (
                                          <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent underline underline-offset-2">{getLinkLabel(link)}</a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))
                          : items.map((pick) => (
                              <div key={pick.id} className="px-4 py-3 border-b border-[#0e0e10] last:border-0">
                                <div className="text-[14px] font-medium text-white">{pick.title}</div>
                                {pick.location && <div className="text-[12px] text-text-faint mt-0.5">{pick.location}</div>}
                                {pick.why && <div className="text-[12px] text-text-muted mt-0.5 leading-[1.5]">{pick.why}</div>}
                                {pick.links.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {pick.links.map((link, i) => (
                                      <a key={i} href={link} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent underline underline-offset-2">{getLinkLabel(link)}</a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                        }
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* Remove friend */}
          <div className="px-6 pt-8 pb-2 flex justify-center">
            <button
              onClick={handleRemoveFriend}
              disabled={removing}
              className="text-[16px] text-red-400 underline underline-offset-2 disabled:opacity-40"
            >
              {removing ? 'Removing…' : 'Remove friend'}
            </button>
          </div>

        </div>
      )}


      {/* Friends list overlay */}
      {showFriends && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowFriends(false)}>
          <div className="fixed inset-0 bg-black/60" />
          <div className="relative w-full bg-bg-base rounded-t-[28px] pt-6 pb-10 max-h-[75vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-border mx-auto mb-5 flex-shrink-0" />
            <div className="px-6 mb-4 flex-shrink-0">
              <div className="text-[18px] font-bold text-white tracking-[-0.4px]">
                {profile?.display_name.split(' ')[0]}'s friends
              </div>
            </div>
            <div className="overflow-y-auto scrollbar-none">
              {friendsList.length === 0 ? (
                <div className="px-6 text-[14px] text-text-faint">No mutual friends visible.</div>
              ) : (
                friendsList.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 px-6 py-3 border-b border-[#0e0e10]">
                    <div className="w-9 h-9 rounded-full bg-bg-card border border-border flex items-center justify-center text-[11px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                        : initials(f.display_name)
                      }
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-white">{f.display_name}</div>
                      <div className="text-[12px] text-text-faint">@{f.username}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ value, label, danger, onPress }: { value: string; label: string; danger?: boolean; onPress?: () => void }) {
  return (
    <div
      className={`flex-1 bg-bg-card rounded-input p-2.5 text-center ${onPress ? 'cursor-pointer active:opacity-70' : ''}`}
      onClick={onPress}
    >
      <div className={`text-[20px] font-bold ${danger ? 'text-bad' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-text-faint mt-0.5">{label}</div>
    </div>
  )
}
