'use client'

import Link from 'next/link'
import { getCategoryLabel } from '@/constants/categories'

const ARROW = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-40">
    <path d="M7 17L17 7"/><path d="M7 7h10v10"/>
  </svg>
)

interface ProfileStatsProps {
  recosSent: number
  recosReceived: number
  recosCompleted: number
  stinkersSent: number
  avgScore: string
  friendsCount: number
  hitRate?: number
  timesForwarded?: number
  avgCompletionDays?: number
  topCategory?: string
  givenHref?: string
  receivedHref?: string
  completedHref?: string
  friendsHref?: string
  onStinkersClick?: () => void
}

export function ProfileStats({
  recosSent,
  recosReceived,
  recosCompleted,
  stinkersSent,
  avgScore,
  friendsCount,
  hitRate,
  timesForwarded,
  avgCompletionDays,
  topCategory,
  givenHref = '/profile/recos?filter=given',
  receivedHref = '/profile/recos?filter=received',
  completedHref = '/profile/recos?filter=completed',
  friendsHref = '/friends',
  onStinkersClick,
}: ProfileStatsProps) {
  const total = recosSent + recosReceived + recosCompleted + stinkersSent || 1

  return (
    <div className="pt-section border-t border-border">
      <div className="text-heading-lg mb-section-sm">Stats</div>

      {/* Reco flow — contained card */}
      <div className="bg-bg-card rounded-card p-card-pad mb-section-sm">
        {/* Ratio bar */}
        <div className="flex h-2 rounded-full overflow-hidden mb-4">
          {recosSent > 0 && <div className="bg-accent transition-all" style={{ width: `${(recosSent / total) * 100}%` }} />}
          {recosReceived > 0 && <div className="bg-[#5BC4F5] transition-all" style={{ width: `${(recosReceived / total) * 100}%` }} />}
          {recosCompleted > 0 && <div className="bg-[#16A34A] transition-all" style={{ width: `${(recosCompleted / total) * 100}%` }} />}
          {stinkersSent > 0 && <div className="bg-[#F56E6E] transition-all" style={{ width: `${(stinkersSent / total) * 100}%` }} />}
        </div>

        {/* Legend — 2x2 grid */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          <Link href={givenHref} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-accent flex-shrink-0" />
            <span className="text-legend text-white flex-1">Given {recosSent}</span>
            {ARROW}
          </Link>
          <Link href={receivedHref} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5BC4F5] flex-shrink-0" />
            <span className="text-legend text-white flex-1">Received {recosReceived}</span>
            {ARROW}
          </Link>
          <Link href={completedHref} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] flex-shrink-0" />
            <span className="text-legend text-white flex-1">Completed {recosCompleted}</span>
            {ARROW}
          </Link>
          {onStinkersClick ? (
            <button onClick={onStinkersClick} className="flex items-center gap-2.5 text-left">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F56E6E] flex-shrink-0" />
              <span className="text-legend text-white flex-1">Stinkers {stinkersSent}</span>
              {ARROW}
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F56E6E] flex-shrink-0" />
              <span className="text-legend text-white flex-1">Stinkers {stinkersSent}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid — 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        {hitRate != null && (
          <div className="bg-bg-card rounded-input p-2.5 text-center">
            <div className="text-stat-value text-white">{hitRate}%</div>
            <div className="text-stat-label text-text-faint mt-0.5">Hit rate</div>
          </div>
        )}
        <div className="bg-bg-card rounded-input p-2.5 text-center">
          <div className="text-stat-value text-white">{avgScore}</div>
          <div className="text-stat-label text-text-faint mt-0.5">Avg score</div>
        </div>
        <Link href={friendsHref} className="bg-bg-card rounded-input p-2.5 text-center">
          <div className="text-stat-value text-white">{friendsCount}</div>
          <div className="text-stat-label text-text-faint mt-0.5">Friends</div>
        </Link>
        {timesForwarded != null && (
          <div className="bg-bg-card rounded-input p-2.5 text-center">
            <div className="text-stat-value text-white">{timesForwarded}</div>
            <div className="text-stat-label text-text-faint mt-0.5">Forwarded</div>
          </div>
        )}
        {avgCompletionDays != null && (
          <div className="bg-bg-card rounded-input p-2.5 text-center">
            <div className={`${String(avgCompletionDays).length > 3 ? 'text-[13px]' : 'text-stat-value'} font-bold text-white`}>{avgCompletionDays}d</div>
            <div className="text-stat-label text-text-faint mt-0.5">Avg complete</div>
          </div>
        )}
        {topCategory && (
          <div className="bg-bg-card rounded-input p-2.5 text-center overflow-hidden">
            <div className={`${getCategoryLabel(topCategory).length > 5 ? 'text-[13px]' : 'text-stat-value'} font-bold text-white truncate`}>{getCategoryLabel(topCategory)}</div>
            <div className="text-stat-label text-text-faint mt-0.5 truncate">Top category</div>
          </div>
        )}
      </div>
    </div>
  )
}
