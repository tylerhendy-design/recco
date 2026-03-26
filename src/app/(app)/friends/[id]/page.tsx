'use client'

import { use } from 'react'
import { StatusBar } from '@/components/ui/StatusBar'
import { NavHeader } from '@/components/ui/NavHeader'
import { Avatar } from '@/components/ui/Avatar'
import { getCategoryColor } from '@/constants/categories'

// ─── Seed data ────────────────────────────────────────────────────────────────

const FRIEND_PROFILES: Record<string, FriendProfile> = {
  u5: {
    id: 'u5',
    display_name: 'Big Jimmy',
    username: 'bigjimmy',
    tier: 'close',
    taste_alignment: 94,
    recos_sent: 31,
    recos_received: 28,
    completed: 24,
    total_to_complete: 31,
    member_since: '8 months',
    last_active: '2 days ago',
    categories: [
      { id: 'restaurant', sent: 14, liked: 13, bad: 1 },
      { id: 'tv',         sent: 9,  liked: 7,  bad: 2 },
      { id: 'film',       sent: 8,  liked: 5,  bad: 3 },
    ],
    recent: [
      { dir: 'sent',     title: 'Bistroteque',    category: 'restaurant', daysAgo: 3,  score: 82 },
      { dir: 'received', title: 'Succession',     category: 'tv',         daysAgo: 7,  score: 95 },
      { dir: 'sent',     title: 'The Menu',       category: 'film',       daysAgo: 14, score: 71 },
      { dir: 'received', title: 'BAO Soho',       category: 'restaurant', daysAgo: 21, score: 88 },
    ],
    verdict: { label: 'Perfect match', color: '#D4E23A', note: 'Trusts your food recos unconditionally. Slight divergence on film.' },
  },
  u1: {
    id: 'u1',
    display_name: 'Sam Huckle',
    username: 'samhuckle',
    tier: 'close',
    taste_alignment: 78,
    recos_sent: 24,
    recos_received: 19,
    completed: 14,
    total_to_complete: 24,
    member_since: '11 months',
    last_active: 'Today',
    categories: [
      { id: 'tv',         sent: 11, liked: 9,  bad: 2 },
      { id: 'film',       sent: 7,  liked: 5,  bad: 2 },
      { id: 'restaurant', sent: 6,  liked: 2,  bad: 4 },
    ],
    recent: [
      { dir: 'received', title: 'The Boys',     category: 'tv',         daysAgo: 2,  score: null },
      { dir: 'sent',     title: 'Padella',      category: 'restaurant', daysAgo: 9,  score: 34 },
      { dir: 'received', title: 'Oppenheimer',  category: 'film',       daysAgo: 16, score: 88 },
      { dir: 'sent',     title: 'The Bear',     category: 'tv',         daysAgo: 22, score: 77 },
    ],
    verdict: { label: 'Strong on TV', color: '#5BC4F5', note: 'Great TV and film taste. Avoid his restaurant recos — track record is poor.' },
  },
  u2: {
    id: 'u2',
    display_name: 'Tyler Hendy',
    username: 'tylerhendy',
    tier: 'close',
    taste_alignment: 71,
    recos_sent: 18,
    recos_received: 22,
    completed: 11,
    total_to_complete: 18,
    member_since: '6 months',
    last_active: '5 days ago',
    categories: [
      { id: 'restaurant', sent: 10, liked: 7, bad: 3 },
      { id: 'tv',         sent: 8,  liked: 5, bad: 3 },
    ],
    recent: [
      { dir: 'sent',     title: 'Frenchie',      category: 'restaurant', daysAgo: 5,  score: 79 },
      { dir: 'received', title: 'Slow Horses',   category: 'tv',         daysAgo: 11, score: null },
      { dir: 'sent',     title: 'Dilpasand',     category: 'restaurant', daysAgo: 18, score: 91 },
    ],
    verdict: { label: 'Solid all-rounder', color: '#c8c8d4', note: 'Consistent across food and TV. Completion rate is healthy.' },
  },
  u3: {
    id: 'u3',
    display_name: 'Alex Horlock',
    username: 'horlock',
    tier: 'clan',
    taste_alignment: 54,
    recos_sent: 12,
    recos_received: 15,
    completed: 6,
    total_to_complete: 12,
    member_since: '14 months',
    last_active: '1 week ago',
    categories: [
      { id: 'podcast',    sent: 7, liked: 6, bad: 1 },
      { id: 'film',       sent: 5, liked: 1, bad: 4 },
    ],
    recent: [
      { dir: 'received', title: 'Acquired',         category: 'podcast', daysAgo: 4,  score: null },
      { dir: 'sent',     title: 'Everything Everywhere', category: 'film', daysAgo: 20, score: 18 },
      { dir: 'received', title: 'Conan Needs a Friend', category: 'podcast', daysAgo: 30, score: 88 },
    ],
    verdict: { label: 'Podcast gold, film avoid', color: '#2DD4BF', note: "His podcast picks are reliable. Film recos are a persistent mismatch — don't act on them." },
  },
  u7: {
    id: 'u7',
    display_name: 'Mum',
    username: 'mum',
    tier: 'tribe',
    taste_alignment: 32,
    recos_sent: 8,
    recos_received: 11,
    completed: 3,
    total_to_complete: 8,
    member_since: '3 months',
    last_active: '3 days ago',
    categories: [
      { id: 'restaurant', sent: 5, liked: 2, bad: 3 },
      { id: 'book',       sent: 3, liked: 1, bad: 2 },
    ],
    recent: [
      { dir: 'received', title: 'The Ivy',        category: 'restaurant', daysAgo: 6,  score: null },
      { dir: 'sent',     title: 'Atomic Habits',  category: 'book',       daysAgo: 25, score: 40 },
    ],
    verdict: { label: 'Early days', color: '#888', note: 'Not enough history to call it. Completion rate is low — worth following up.' },
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryStat { id: string; sent: number; liked: number; bad: number }
interface RecentReco { dir: 'sent' | 'received'; title: string; category: string; daysAgo: number; score: number | null }
interface FriendProfile {
  id: string; display_name: string; username: string; tier: string
  taste_alignment: number; recos_sent: number; recos_received: number
  completed: number; total_to_complete: number; member_since: string; last_active: string
  categories: CategoryStat[]
  recent: RecentReco[]
  verdict: { label: string; color: string; note: string }
}

const TIER_LABEL: Record<string, string> = { close: 'Close friend', clan: 'Clan', tribe: 'Tribe' }
const CAT_LABEL: Record<string, string> = { restaurant: 'Food', tv: 'TV', film: 'Film', podcast: 'Podcasts', music: 'Music', book: 'Books' }

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-bg-card border border-border rounded-card p-3.5 flex flex-col gap-0.5">
      <div className={`text-[22px] font-bold tracking-[-0.5px] ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      <div className="text-[12px] font-semibold text-text-secondary leading-[1.3]">{label}</div>
      {sub && <div className="text-[11px] text-text-dim mt-0.5">{sub}</div>}
    </div>
  )
}

function CategoryBar({ cat }: { cat: CategoryStat }) {
  const color = getCategoryColor(cat.id)
  const total = cat.liked + cat.bad
  const pct = total === 0 ? 0 : Math.round((cat.liked / total) * 100)
  const label = CAT_LABEL[cat.id] ?? cat.id

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-baseline mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
          <span className="text-[13px] font-medium text-white">{label}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-text-faint">{cat.sent} sent</span>
          <span style={{ color }} className="font-semibold">{pct}% liked</span>
        </div>
      </div>
      {/* Bar */}
      <div className="relative h-[6px] bg-[#1e1e22] rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="flex gap-3 mt-1.5">
        <span className="text-[10px] text-text-faint">{cat.liked} liked</span>
        {cat.bad > 0 && <span className="text-[10px] text-bad/70">{cat.bad} bad</span>}
      </div>
    </div>
  )
}

function RecoRow({ reco }: { reco: RecentReco }) {
  const color = getCategoryColor(reco.category)
  const isSent = reco.dir === 'sent'
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
      {/* direction indicator */}
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: isSent ? 'rgba(212,226,58,0.1)' : 'rgba(255,255,255,0.05)' }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={isSent ? '#D4E23A' : '#666'} strokeWidth="2.5" strokeLinecap="round">
          {isSent
            ? <path d="M12 19V5M5 12l7-7 7 7"/>
            : <path d="M12 5v14M5 12l7 7 7-7"/>
          }
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-white truncate">{reco.title}</div>
        <div className="text-[11px] mt-0.5" style={{ color }}>
          {CAT_LABEL[reco.category] ?? reco.category} · {reco.daysAgo === 0 ? 'Today' : reco.daysAgo === 1 ? '1 day ago' : `${reco.daysAgo} days ago`}
        </div>
      </div>
      {reco.score != null ? (
        <div
          className="text-[12px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
          style={{
            color: reco.score >= 65 ? '#D4E23A' : reco.score >= 35 ? '#888' : '#ef4444',
            background: reco.score >= 65 ? 'rgba(212,226,58,0.1)' : reco.score >= 35 ? 'rgba(136,136,136,0.1)' : 'rgba(239,68,68,0.1)',
          }}
        >
          {reco.score}
        </div>
      ) : (
        <span className="text-[10px] font-semibold text-text-faint bg-bg-card px-2 py-0.5 rounded-md border border-border flex-shrink-0">Pending</span>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FriendProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const profile = FRIEND_PROFILES[id]

  if (!profile) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <StatusBar />
        <NavHeader title="friend" closeHref="/friends" />
        <div className="flex-1 flex items-center justify-center text-text-faint text-sm">No data for this friend yet.</div>
      </div>
    )
  }

  const completionPct = Math.round((profile.completed / profile.total_to_complete) * 100)
  const tierColor = profile.tier === 'close' ? '#D4E23A' : profile.tier === 'clan' ? '#c8c8d4' : '#888'
  const tierBg   = profile.tier === 'close' ? '#1e1c04' : profile.tier === 'clan' ? '#1e1e22' : '#1a1a1a'

  // Best / worst category
  const ranked = [...profile.categories].sort((a, b) => {
    const pa = a.liked / (a.liked + a.bad || 1)
    const pb = b.liked / (b.liked + b.bad || 1)
    return pb - pa
  })
  const best  = ranked[0]
  const worst = ranked[ranked.length - 1]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <StatusBar />
      <NavHeader title={profile.display_name.split(' ')[0].toLowerCase()} closeHref="/friends" />

      <div className="flex-1 overflow-y-auto scrollbar-none px-5 pt-4 pb-8 flex flex-col gap-4">

        {/* Hero */}
        <div className="bg-bg-card border border-border rounded-card p-4 flex items-center gap-4">
          <Avatar
            name={profile.display_name}
            imageUrl={null}
            size="lg"
            color={tierColor}
            bgColor={tierBg}
          />
          <div className="flex-1 min-w-0">
            <div className="text-[18px] font-bold text-white tracking-[-0.4px] leading-none mb-1">
              {profile.display_name}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold px-2 py-[3px] rounded-chip border" style={{ color: tierColor, borderColor: `${tierColor}44`, background: `${tierColor}0f` }}>
                {TIER_LABEL[profile.tier] ?? profile.tier}
              </span>
              <span className="text-[11px] text-text-faint">since {profile.member_since}</span>
            </div>
            <div className="text-[11px] text-text-faint">Last active {profile.last_active}</div>
          </div>
          {/* Alignment score */}
          <div className="text-right flex-shrink-0">
            <div className="text-[32px] font-bold leading-none" style={{ color: profile.taste_alignment >= 85 ? '#D4E23A' : profile.taste_alignment >= 60 ? '#c8c8d4' : '#888' }}>
              {profile.taste_alignment}
            </div>
            <div className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.4px] mt-0.5">alignment</div>
          </div>
        </div>

        {/* Verdict */}
        <div className="rounded-card border px-4 py-3" style={{ borderColor: `${profile.verdict.color}33`, background: `${profile.verdict.color}08` }}>
          <div className="text-[12px] font-bold mb-0.5" style={{ color: profile.verdict.color }}>{profile.verdict.label}</div>
          <div className="text-[12px] text-text-muted leading-[1.5]">{profile.verdict.note}</div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Recos sent" value={String(profile.recos_sent)} sub="from you to them" />
          <StatCard label="Recos received" value={String(profile.recos_received)} sub="from them to you" />
          <StatCard
            label="Completion rate"
            value={`${completionPct}%`}
            sub={`${profile.completed} of ${profile.total_to_complete} done`}
            accent={completionPct >= 70}
          />
          <StatCard
            label="Taste alignment"
            value={`${profile.taste_alignment}%`}
            sub="across all categories"
            accent={profile.taste_alignment >= 80}
          />
        </div>

        {/* Category breakdown */}
        <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-4">
          <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase mb-4">
            Category breakdown
          </div>
          {profile.categories.map((cat) => (
            <CategoryBar key={cat.id} cat={cat} />
          ))}
        </div>

        {/* Best / Worst */}
        {best && worst && best.id !== worst.id && (
          <div className="grid grid-cols-2 gap-2.5">
            <div className="bg-bg-card border border-border rounded-card p-3.5">
              <div className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.5px] mb-1.5">Most trusted</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getCategoryColor(best.id) }} />
                <span className="text-[14px] font-semibold text-white">{CAT_LABEL[best.id] ?? best.id}</span>
              </div>
              <div className="text-[11px] mt-1" style={{ color: getCategoryColor(best.id) }}>
                {Math.round((best.liked / (best.liked + best.bad || 1)) * 100)}% liked
              </div>
            </div>
            <div className="bg-bg-card border border-border rounded-card p-3.5">
              <div className="text-[10px] font-semibold text-text-faint uppercase tracking-[0.5px] mb-1.5">Avoid</div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-bad/60 flex-shrink-0" />
                <span className="text-[14px] font-semibold text-white">{CAT_LABEL[worst.id] ?? worst.id}</span>
              </div>
              <div className="text-[11px] text-bad/80 mt-1">
                {Math.round((worst.bad / (worst.liked + worst.bad || 1)) * 100)}% bad recos
              </div>
            </div>
          </div>
        )}

        {/* Recent exchange */}
        <div className="bg-bg-card border border-border rounded-card px-4 pt-4 pb-2">
          <div className="text-[13px] font-semibold text-text-muted tracking-[0.3px] uppercase mb-1">
            Recent exchange
          </div>
          <div className="text-[11px] text-text-faint mb-3">
            <span className="inline-flex items-center gap-1 mr-3">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/60" />sent by you
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />received
            </span>
          </div>
          {profile.recent.map((reco, i) => (
            <RecoRow key={i} reco={reco} />
          ))}
        </div>

      </div>
    </div>
  )
}
