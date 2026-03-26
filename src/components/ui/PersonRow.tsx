import { Avatar } from './Avatar'
import { cn } from '@/lib/utils'
import type { Friend } from '@/types/app.types'
import { getCategoryColor } from '@/constants/categories'

interface PersonRowProps {
  friend: Friend
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

const HEART_SVG = (color: string) => (
  <svg width="7" height="7" viewBox="0 0 24 24" fill={color}>
    <path d="M12 21C12 21 3 13.5 3 8a5 5 0 0110 0 5 5 0 0110 0c0 5.5-9 13-9 13z" />
  </svg>
)

const TIER_COLORS: Record<string, { color: string; bg: string }> = {
  close: { color: '#D4E23A', bg: '#1e1c04' },
  clan: { color: '#c8c8d4', bg: '#1e1e22' },
  tribe: { color: '#888', bg: '#1e1e1e' },
}

export function PersonRow({ friend, onClick, className, style }: PersonRowProps) {
  const tierColors = TIER_COLORS[friend.tier] ?? TIER_COLORS.tribe
  const isSinbinned = friend.is_sinbinned

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex justify-between items-center px-6 py-3 border-b border-bg-card cursor-pointer hover:bg-bg-hover transition-colors',
        isSinbinned && 'opacity-90',
        className
      )}
      style={style}
    >
      <div className="flex items-center gap-3">
        <Avatar
          name={friend.display_name}
          imageUrl={friend.avatar_url}
          size="md"
          color={isSinbinned ? '#ef4444' : tierColors.color}
          bgColor={isSinbinned ? '#2a0e0e' : tierColors.bg}
        />
        <div>
          <div
            className="text-[15px] font-medium tracking-[-0.3px]"
            style={{ color: isSinbinned ? '#ef4444' : friend.tier === 'close' ? '#D4E23A' : '#fff' }}
          >
            {friend.display_name}
          </div>
          {isSinbinned ? (
            <div className="mt-1">
              <span className="inline-flex items-center gap-1 bg-bad/10 border border-bad/30 rounded-chip px-[7px] py-[2px] text-[9px] font-semibold text-bad">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Sin bin · {friend.sinbin_count} bad {friend.sinbin_category} recos
              </span>
            </div>
          ) : (
            <div className="flex gap-1 mt-1 flex-wrap">
              {friend.taste_by_category?.map((taste) => {
                const catColor = getCategoryColor(taste.category)
                const bg = taste.category + '-bg'
                return (
                  <span
                    key={taste.category}
                    className="text-[9px] font-semibold px-[7px] py-[2px] rounded-chip flex items-center gap-[2px]"
                    style={{ color: taste.is_mismatch ? '#3a3a42' : catColor, background: taste.is_mismatch ? '#1e1e22' : 'transparent', border: `1px solid ${taste.is_mismatch ? '#2a2a30' : 'transparent'}` }}
                  >
                    {!taste.is_mismatch && Array.from({ length: taste.heart_count }).map((_, i) => (
                      <span key={i}>{HEART_SVG(catColor)}</span>
                    ))}
                    {taste.is_mismatch ? `${getCategoryLabel(taste.category)} ✕` : getCategoryLabel(taste.category)}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div className="text-right">
        {isSinbinned ? (
          <div className="text-[11px] font-semibold text-bad">Blocked</div>
        ) : (
          <>
            {friend.taste_alignment >= 90 && (
              <div className="text-[11px] font-bold text-accent">Perfect</div>
            )}
            <div
              className="text-xs font-semibold"
              style={{ color: friend.taste_alignment >= 85 ? '#D4E23A' : '#c8c8d4' }}
            >
              {friend.taste_alignment}%
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Helper used inside PersonRow
function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    restaurant: 'Food',
    tv: 'TV',
    podcast: 'Pods',
    music: 'Music',
    book: 'Books',
    film: 'Film',
  }
  return map[category] ?? category
}
