'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBar } from '@/components/ui/StatusBar'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import { fetchUserPicks, type Pick } from '@/lib/data/picks'

type ProfileStats = {
  display_name: string
  username: string
  avatar_url: string | null
  joined_at: string
  recos_sent: number
  friends_count: number
  recos_completed: number
  stinkers_sent: number
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState<ProfileStats | null>(null)
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [
        { data: prof },
        { data: sentRecos },
        { count: friendsCount },
        { count: recosCompleted },
        userPicks,
      ] = await Promise.all([
        supabase.from('profiles').select('display_name, username, avatar_url, joined_at').eq('id', user.id).single(),
        supabase.from('recommendations').select('id').eq('sender_id', user.id),
        supabase.from('friend_connections').select('*', { count: 'exact', head: true })
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
          .eq('status', 'accepted'),
        supabase.from('reco_recipients').select('*', { count: 'exact', head: true })
          .eq('recipient_id', user.id)
          .eq('status', 'done'),
        fetchUserPicks(user.id),
      ])

      const sentIds = sentRecos?.map((r) => r.id) ?? []
      const recosSent = sentIds.length

      // Count stinkers separately using the IDs we already have
      let stinkersSent = 0
      if (sentIds.length > 0) {
        const { count } = await supabase
          .from('reco_recipients')
          .select('*', { count: 'exact', head: true })
          .in('reco_id', sentIds)
          .eq('status', 'done')
          .lt('score', 40)
        stinkersSent = count ?? 0
      }

      if (prof) {
        setProfile({
          display_name: prof.display_name,
          username: prof.username,
          avatar_url: prof.avatar_url,
          joined_at: prof.joined_at,
          recos_sent: recosSent,
          friends_count: friendsCount ?? 0,
          recos_completed: recosCompleted ?? 0,
          stinkers_sent: stinkersSent,
        })
      }

      setPicks(userPicks)

      setLoading(false)
    }
    load()
  }, [])

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
  }

  const joinYear = profile?.joined_at ? new Date(profile.joined_at).getFullYear() : null

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <button onClick={() => router.back()} className="text-text-faint p-1 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-white">Profile</span>
        <div className="w-8" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      ) : profile ? (
        <div className="flex-1 overflow-y-auto scrollbar-none pb-6">

          {/* Avatar + name */}
          <div className="px-6 pb-6 border-b border-bg-card">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-full bg-[#1e1c04] border-2 border-accent flex items-center justify-center text-[20px] font-bold text-accent flex-shrink-0 overflow-hidden">
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

            <div className="flex gap-2.5 mb-2.5">
              <StatBox value={String(profile.recos_sent)} label="Recos sent" />
              <StatBox value={String(profile.friends_count)} label="Friends" />
            </div>
            <div className="flex gap-2.5">
              <StatBox value={String(profile.recos_completed)} label="Completed" />
              <StatBox value={String(profile.stinkers_sent)} label="Stinkers sent" danger />
            </div>
          </div>

          {/* Picks */}
          <SectionLabel>I'd recommend to anyone</SectionLabel>
          {picks.length === 0 ? (
            <EmptyFav>Add your favourite restaurants, films, books and more in Edit profile.</EmptyFav>
          ) : (
            Object.entries(
              picks.reduce<Record<string, typeof picks>>((acc, p) => {
                if (!acc[p.category]) acc[p.category] = []
                acc[p.category].push(p)
                return acc
              }, {})
            ).map(([category, items]) => (
              <div key={category}>
                <div className="text-[11px] font-semibold text-accent tracking-[0.5px] uppercase px-6 pt-4 pb-1">{category}</div>
                {items.map((pick) => (
                  <div key={pick.id} className="px-6 py-3 border-b border-[#0e0e10]">
                    <div className="text-[14px] font-medium text-white">{pick.title}</div>
                  </div>
                ))}
              </div>
            ))
          )}

          {/* Settings */}
          <div className="mt-4">
            <SettingsRow label="Edit profile" onPress={() => router.push('/edit-profile')} />
          </div>

          {/* Sign out */}
          <div className="px-6 pt-6">
            <button
              onClick={signOut}
              disabled={signingOut}
              className="w-full py-4 rounded-btn border border-border text-[15px] font-semibold text-red-400 hover:border-red-400 transition-colors disabled:opacity-40"
            >
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>

        </div>
      ) : null}
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold tracking-[0.8px] uppercase text-text-faint px-6 pt-5 pb-2">
      {children}
    </div>
  )
}

function EmptyFav({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-3">
      <p className="text-[13px] text-text-faint leading-[1.5]">{children}</p>
    </div>
  )
}

function SettingsRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center justify-between px-6 py-4 border-b border-[#0e0e10] hover:bg-bg-card transition-colors"
    >
      <span className="text-[15px] text-white">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6e6e78" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  )
}
