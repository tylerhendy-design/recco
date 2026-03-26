# reco.

> Your collection of recommendations. Human taste, no algorithms.

## Stack

- **Next.js 15** (App Router) — routing, SSR, API routes
- **TypeScript** — end-to-end type safety
- **Tailwind CSS** — all design tokens from the prototype locked into `tailwind.config.ts`
- **Supabase** — Postgres, auth (magic link + OAuth), realtime, storage
- **Framer Motion** — screen transitions and bottom sheet animations (Phase 5)

## Getting started

### 1. Install Node.js

If you don't have Node.js installed:
```bash
# Using nvm (recommended):
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22
nvm use 22

# Or via Homebrew:
brew install node
```

### 2. Install dependencies

```bash
cd /Users/macbook/Desktop/RECO/app
npm install
```

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase project values.
Get them from: https://supabase.com/dashboard → your project → Settings → API

### 4. Set up Supabase

1. Create a project at https://supabase.com
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Enable Realtime for `notifications` and `messages` tables in your Supabase dashboard

### 5. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 — you'll see the phone shell on desktop, full-screen on mobile.

---

## Build phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | App shell, design system, all 14 screens (static data) |
| 2 | Next | Core data layer — Supabase hooked up, send/receive/rate loop works |
| 3 | Pending | Social features — friends, notifications, realtime |
| 4 | Pending | Lists, QR codes, profile stats, Spotify metadata |
| 5 | Pending | PWA, animations, keyboard avoidance, haptics |

---

## Project structure

```
src/
├── app/
│   ├── (auth)/onboarding/    — 5-slide intro flow
│   ├── (app)/                — authenticated screens with tab bar
│   │   ├── home/             — ranked reco feed
│   │   ├── browse/           — all recos by category
│   │   ├── send/             — send a reco form
│   │   ├── get/              — request a reco
│   │   ├── lists/            — curated lists
│   │   ├── friends/          — friend tiers, taste alignment, sin bin
│   │   ├── notifications/    — activity feed + threads
│   │   └── profile/          — user stats
│   └── api/spotify/          — Spotify metadata proxy
├── components/
│   ├── ui/                   — design system primitives
│   └── overlays/             — bottom sheets (feedback, map, sin bin)
├── constants/
│   ├── categories.ts         — category colours, labels, extra fields
│   └── tiers.ts              — tier weights, sin bin thresholds
├── lib/supabase/             — browser + server clients
└── types/                    — app types + generated DB types
```

## Key design decisions

- **Friend tiers**: Band (5) → Close (15) → Clan (50) → Tribe (150). Tier weight drives reco ranking.
- **Sin bin**: 3 bad scores (< 35/100) in one category = blocked. Database trigger, not app logic.
- **Taste alignment**: Calculated on read from `reco_recipients`. No stale stored values.
- **No algorithm**: Ranking is `(recommender_count × tier_weight) + recency_boost`, fully transparent.
- **PWA-first**: Max-width container, no URL bar on install, portrait lock, haptic feedback.
