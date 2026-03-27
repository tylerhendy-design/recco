'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { PleaSheet } from '@/components/overlays/PleaSheet'
import { fetchMySinBin, fetchAllSinBinnedBy, releaseSinBin, type SinBinEntry } from '@/lib/data/sinbin'
import { getCategoryLabel } from '@/constants/categories'
import { initials } from '@/lib/utils'

type MySinBinEntry = SinBinEntry & { sender_name: string; sender_username: string; sender_avatar: string | null; offences: string[] }
type TheirSinBinEntry = SinBinEntry & { recipient_name: string; offences: string[] }

export default function SinBinPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [mine, setMine] = useState<MySinBinEntry[]>([])
  const [theirs, setTheirs] = useState<TheirSinBinEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mine' | 'theirs'>('mine')
  const [pleaTarget, setPleaTarget] = useState<{ toUserId: string; toName: string; category: string } | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const [mineData, theirsData] = await Promise.all([
        fetchMySinBin(user.id),
        fetchAllSinBinnedBy(user.id),
      ])
      setMine(mineData)
      setTheirs(theirsData as TheirSinBinEntry[])
      setLoading(false)
    })
  }, [])

  async function handleRelease(entry: MySinBinEntry) {
    if (!userId) return
    await releaseSinBin(entry.sender_id, userId, entry.category)
    setMine((prev) => prev.filter((e) => !(e.sender_id === entry.sender_id && e.category === entry.category)))
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title="Sin bin" />

      {/* Toggle */}
      <div className="flex justify-center px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex bg-bg-card border border-border rounded-chip p-0.5">
          <button
            onClick={() => setTab('mine')}
            className={`px-4 py-1.5 rounded-chip text-[12px] font-semibold transition-colors ${
              tab === 'mine' ? 'bg-accent text-accent-fg' : 'text-text-faint hover:text-white'
            }`}
          >
            Your sin bin
            {mine.length > 0 && (
              <span className={`ml-1.5 text-[10px] ${tab === 'mine' ? 'text-accent-fg/70' : 'text-text-faint'}`}>
                {mine.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('theirs')}
            className={`px-4 py-1.5 rounded-chip text-[12px] font-semibold transition-colors ${
              tab === 'theirs' ? 'bg-bad text-white' : 'text-text-faint hover:text-white'
            }`}
          >
            Bins you're in
            {theirs.length > 0 && (
              <span className={`ml-1.5 text-[10px] ${tab === 'theirs' ? 'text-white/70' : 'text-text-faint'}`}>
                {theirs.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none pb-8 pt-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : tab === 'mine' ? (
          mine.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-[28px] mb-3">😇</div>
              <div className="text-[14px] font-semibold text-white mb-1">No one's in your sin bin.</div>
              <div className="text-[13px] text-text-faint">Lucky you.</div>
            </div>
          ) : (
            mine.map((entry) => (
              <SinBinCard
                key={`${entry.sender_id}-${entry.category}`}
                name={entry.sender_name}
                username={entry.sender_username}
                avatarUrl={entry.sender_avatar}
                badCount={entry.bad_count}
                category={entry.category}
                offences={entry.offences}
                youGave={false}
                action={
                  <button
                    onClick={() => handleRelease(entry)}
                    className="px-3 py-1.5 rounded-chip border border-accent text-[12px] font-semibold text-accent hover:bg-accent/10 transition-colors"
                  >
                    Release
                  </button>
                }
              />
            ))
          )
        ) : (
          theirs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-[28px] mb-3">🙌</div>
              <div className="text-[14px] font-semibold text-white mb-1">You're not in anyone's sin bin.</div>
              <div className="text-[13px] text-text-faint">Keep it that way.</div>
            </div>
          ) : (
            theirs.map((entry) => (
              <SinBinCard
                key={`${entry.recipient_id}-${entry.category}`}
                name={entry.recipient_name}
                badCount={entry.bad_count}
                category={entry.category}
                offences={entry.offences}
                youGave={true}
                action={
                  <button
                    onClick={() => setPleaTarget({ toUserId: entry.recipient_id, toName: entry.recipient_name, category: entry.category })}
                    className="px-3 py-1.5 rounded-chip border border-bad/40 text-[12px] font-semibold text-bad/80 hover:bg-bad/10 transition-colors"
                  >
                    Plead to get out
                  </button>
                }
              />
            ))
          )
        )}
      </div>

      {userId && pleaTarget && (
        <PleaSheet
          open={!!pleaTarget}
          onClose={() => setPleaTarget(null)}
          fromUserId={userId}
          toUserId={pleaTarget.toUserId}
          toName={pleaTarget.toName}
          category={pleaTarget.category}
        />
      )}
    </div>
  )
}

function SinBinCard({
  name,
  username,
  avatarUrl,
  badCount,
  category,
  offences,
  action,
  youGave,
}: {
  name: string
  username?: string
  avatarUrl?: string | null
  badCount: number
  category: string
  offences: string[]
  action: React.ReactNode
  youGave?: boolean
}) {
  const catLabel = getCategoryLabel(category).toLowerCase()
  const firstName = name.split(' ')[0]
  return (
    <div className="mx-4 mb-3 rounded-card border border-border bg-bg-card overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-bg-base border border-border flex items-center justify-center text-[11px] font-bold text-text-secondary overflow-hidden flex-shrink-0">
          {avatarUrl
            ? <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            : initials(name)
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-white">{name}</div>
          {username && <div className="text-[11px] text-text-faint">@{username}</div>}
        </div>
      </div>
      <div className="px-4 pb-3 border-t border-[#0e0e10] pt-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] text-text-muted leading-[1.5]">
            {youGave
              ? <>You gave {firstName} <span className="font-semibold text-bad">{badCount} stinkers</span> which were {catLabel}</>
              : <>{firstName} gave you <span className="font-semibold text-bad">{badCount} stinkers</span> which were {catLabel}</>
            }
          </div>
          {offences.length > 0 && (
            <div className="text-[11px] text-text-faint mt-1">
              {offences.join(', ')}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">{action}</div>
      </div>
    </div>
  )
}
