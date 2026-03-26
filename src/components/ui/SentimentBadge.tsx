import { scoreLabel, scoreText } from '@/constants/tiers'
import { getSentimentBg, getSentimentColor } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface SentimentBadgeProps {
  score: number
  className?: string
}

export function SentimentBadge({ score, className }: SentimentBadgeProps) {
  return (
    <span
      className={cn('text-[9px] font-bold px-2 py-1 rounded-chip uppercase tracking-[0.3px]', className)}
      style={{
        color: getSentimentColor(score),
        background: getSentimentBg(score),
      }}
    >
      {scoreText(score)}
    </span>
  )
}

interface SentimentPillProps {
  score: number
  className?: string
}

export function SentimentPill({ score, className }: SentimentPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-[3px] rounded-chip text-[10px] font-bold',
        className
      )}
      style={{
        color: getSentimentColor(score),
        background: getSentimentBg(score),
      }}
    >
      {scoreText(score)}
    </span>
  )
}
