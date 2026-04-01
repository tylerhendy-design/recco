import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { scoreLabel } from '@/constants/tiers'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days < 7) return days === 1 ? 'Yesterday' : `${days} days ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// Score colours — psychology-driven: red (bad) → amber (mid) → green (good)
// 1-4: red spectrum, 5-6: amber, 7-10: green spectrum
export function getScoreColor(score: number): string {
  const s = Math.max(1, Math.min(10, score))
  if (s <= 2) return '#EF4444'  // red-500 — terrible
  if (s <= 4) return '#F87171'  // red-400 — bad
  if (s <= 6) return '#FBBF24'  // amber-400 — meh
  if (s <= 8) return '#4ADE80'  // green-400 — good
  return '#22C55E'              // green-500 — great
}

// Text colour for score badges — white on red for contrast, black on everything else
export function getScoreTextColor(score: number): string {
  return Math.max(1, Math.min(10, score)) <= 4 ? '#fff' : '#000'
}

export function getSentimentColor(score: number): string {
  const label = scoreLabel(score)
  if (label === 'bad') return '#ef4444'
  if (label === 'meh') return '#888888'
  return '#22c55e'
}

export function getSentimentBg(score: number): string {
  const label = scoreLabel(score)
  if (label === 'bad') return 'rgba(239,68,68,0.1)'
  if (label === 'meh') return 'rgba(136,136,136,0.08)'
  return 'rgba(34,197,94,0.1)'
}

export function getSentimentLabel(score: number): string {
  const label = scoreLabel(score)
  if (label === 'bad') return 'Bad'
  if (label === 'meh') return 'Meh'
  return 'Good'
}

export function today(): string {
  return new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
