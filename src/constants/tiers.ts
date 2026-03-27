export type TierId = 'close' | 'clan' | 'tribe' | 'sinbin'

export interface TierDef {
  id: TierId
  label: string
  maxSize: number
  weight: number  // for reco ranking
  description: string
  body: string
}

export const TIERS: TierDef[] = [
  {
    id: 'close',
    label: 'Close friends',
    maxSize: 15,
    weight: 3,
    description: 'Up to 15',
    body: 'Your inner circle. Their recos carry the most weight and appear first. Taste alignment matters most here.',
  },
  {
    id: 'clan',
    label: 'Clan',
    maxSize: 50,
    weight: 2,
    description: 'Up to 50',
    body: "Good friends whose taste you generally trust. Recos land with context — you know where they're coming from.",
  },
  {
    id: 'tribe',
    label: 'Tribe',
    maxSize: 150,
    weight: 1,
    description: 'Up to 150',
    body: 'Your broader network. Recos are surfaced but weighted less. Good for breadth, not depth of trust.',
  },
]

export const TIER_MAP = Object.fromEntries(
  TIERS.map((t) => [t.id, t])
) as Record<TierId, TierDef>

// Sin bin info (not a real tier, displayed separately)
export const SIN_BIN_INFO = {
  id: 'sinbin' as const,
  label: 'Sin bin',
  description: '',
  body: 'People blocked from a category after 3 bad recos in a row. They can request to be let out.',
}

export const ALL_FRIEND_INFO = {
  title: 'All friends',
  body: 'All people across all groups. Each tier changes how much weight their recos carry.',
}

/** Score thresholds */
export const SCORE = {
  BAD_MAX: 3,
  MEH_MAX: 6,
  SIN_BIN_THRESHOLD: 3,
} as const

export function scoreLabel(score: number): 'bad' | 'meh' | 'good' {
  if (score <= SCORE.BAD_MAX) return 'bad'
  if (score <= SCORE.MEH_MAX) return 'meh'
  return 'good'
}

export function scoreText(score: number): string {
  const label = scoreLabel(score)
  if (label === 'bad') return `Bad · ${score}`
  if (label === 'meh') return `Meh · ${score}`
  return `Good · ${score}`
}
