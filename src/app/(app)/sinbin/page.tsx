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

      <div className="flex-1 overflow-y-auto scrollbar-none pb-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-border border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* In your sin bin */}
            <div className="px-6 pt-6 pb-2">
              <div className="text-[11px] font-semibold text-text-faint tracking-[0.7px] uppercase mb-3">
                In your sin bin · {mine.length}
              </div>
            </div>

            {mine.length === 0 ? (
              <div className="px-6 py-3 text-[14px] text-text-faint">
                No one's in your sin bin.
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
            )}

            <div className="mx-6 my-5 border-t border-border" />

            {/* You're in their sin bin */}
            <div className="px-6 pb-2">
              <div className="text-[11px] font-semibold text-text-faint tracking-[0.7px] uppercase mb-3">
                You're in their sin bin · {theirs.length}
              </div>
            </div>

            {theirs.length === 0 ? (
              <div className="px-6 py-3 text-[14px] text-text-faint">
                You're not in anyone's sin bin.
              </div>
            ) : (
              theirs.map((entry) => (
                <SinBinCard
                  key={`${entry.recipient_id}-${entry.category}`}
                  name={entry.recipient_name}
                  badCount={entry.bad_count}
                  category={entry.category}
                  offences={entry.offences}
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
            )}
          </>
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
}: {
  name: string
  username?: string
  avatarUrl?: string | null
  badCount: number
  category: string
  offences: string[]
  action: React.ReactNode
}) {
  const catLabel = getCategoryLabel(category).toLowerCase()
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
            <span className="font-semibold text-bad">{badCount} stinkers</span> which were {catLabel}
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
