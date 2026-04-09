  # RECO — Claude Code Context

---

## Development principles

### 1. Usability and functionality above all else
Every feature must work end-to-end. A notification you can't tap, a button that doesn't respond, a flow that dead-ends — these aren't minor bugs, they're failures. Before adding anything new, the question is always: does the thing we already built actually work on a real phone, with a real thumb, on a spotty connection? Ship working features, not half-wired ones.

### 2. Mobile-first, always
This is a mobile app that happens to live in a browser for now. Every layout, tap target, animation, and interaction must be designed for a phone screen first. Desktop is a bonus, not the target. Think thumb zones, think scroll behaviour, think iOS Safari quirks. The goal is to ship this as a native app — build as if that's already happened.

### 3. Think in journeys, not screens
Every feature exists somewhere in a user journey. When you add something, trace the full path: where does the user come from? Where do they go next? What happens downstream? A voice note on the Give page means a voice note player on the Reco card. A website pulled from Places API means a website link on the expanded card. Never build one half of a feature. If it's created somewhere, it must surface everywhere it's relevant — send flow, home feed, expanded card, notifications, profile. Features have knock-on effects; account for them upfront rather than patching them later.

### 4. Don't ship what you haven't tested as a user
Before calling a feature done: open it on your phone, use it like a real person would. Tap everything. Try the unhappy path. If it feels clunky, it is clunky — fix it now, not next sprint.

### 5. Typography rules
Never use italic text anywhere in the app unless explicitly asked. All text must follow a clear typographic hierarchy: large bold headings, medium-weight subheadings, regular body text, small muted secondary text. Consistent sizing, consistent weight progression, consistent spacing. Good hierarchy means users can scan any screen and instantly know what matters most.

### 8. State persistence
When a user completes an action (accepts a friend request, marks a reco as done, archives a notification, submits feedback), that state must persist to the database immediately. It must survive page reloads, tab switches, and app restarts. Never store completion state in React state alone. If the user sees "Accepted" after tapping accept, they must see "Accepted" when they come back tomorrow. This is non-negotiable — every app does this. Use the `payload.handled` pattern on notifications, status fields on reco_recipients, and database writes for all state changes.

### 9. Use every piece of data you have
When an API returns data — images, links, addresses, websites, maps locations, artist names, genre, streaming service — store it and display it. Never discard available data. If Google Places gives you a website and photo, show both. If TMDB gives you a poster, show it. If a reco has a location, link it to Google Maps. If a pick has a location, auto-generate a Maps link. Every piece of data makes the reco richer and more useful. A reco card with an image, a Maps link, a website link, and detail pills is dramatically more valuable than one with just a title. When building any feature that touches an API, check what fields are available and surface all of them.

### 10. Location means the city
The `location` field on a reco must always be the **city** (e.g. "Amsterdam", "Paris", "London"). Never the place name, never the street address, never a suburb on its own. A Google Maps link contains the city — extract it. The street address goes in the `address` field. When displaying location on cards, lozenges, or the Places page, it must answer the question "what city is this in?" — not repeat the name of the place. If a user pastes a Maps link, parse it for city, address, and image at send time. A Maps link IS the location data — treat it as such.

### 7. Dropdowns and overlays
Every dropdown must appear directly below (or adjacent to) the element that triggered it — never at the bottom of the screen disconnected from context. Use `position: relative` on the trigger parent with `position: absolute; top: 100%` on the dropdown. The trigger's container must get a high `z-index` when the dropdown is open so it sits above all other content. Always add a fixed `bg-black/30` backdrop behind the dropdown that covers the full screen and closes the dropdown on tap. No dropdown should ever be hidden behind other content — it must be the top layer of the entire app when open. The only exception is action menus (like the three-dot menu on reco cards) where a bottom sheet makes sense because the actions are not tied to a specific word or label.

### 6. Colour contrast
Always ensure legible colour contrast for important information. White text on light backgrounds (yellow, green, light grey) is not readable. Use dark text (#000 or #111) on light/bright backgrounds and light text (#fff) on dark backgrounds. Scores, badges, labels, and any data the user needs to read at a glance must pass this check. If in doubt, use black text on coloured backgrounds.

---

## What RECO is and why it exists

**Tagline: "It's not for everyone."** That's the point — not every reco is right for every person. The app is built around human nuance, not algorithmic matching.

### The soul of RECO

RECO is an app for shared experience and a nuanced understanding of your friends. The power of a recommendation can change someone's trip or their life. It holds up a mirror — when you give someone a reco, you're showing them what you think they'd love. And in doing so, you're showing them what *you* think is good. It reveals where you have shared taste and where you don't. Often, that difference is the most interesting part.

This is going back to the roots of social: meaningful and genuinely connected. Fewer connections that are deeper, not a lot of surface level. RECO is primarily **a place for all your recommendations, in a shared space with your closest friends.**

### The enemy

RECO exists because the current tools are broken:

- **Google Maps stars** you added seven years ago and don't know why you still have them.
- **Spreadsheets** you share with visitors to your city because you can't be bothered giving them a personalised one.
- **Your notes app** filled with write-ups of where to go next, forgetting who told you to go there.
- **One-size-fits-all recommendation lists** — going where Top Jaw says to go isn't personalised. Complex individuals need something an algorithm won't provide. Only a human who deeply knows you will.

### The problem it solves

Recommendations break down in three ways today:
1. **They disappear.** You save something to Google Maps or a notes app and forget where it came from, why it was recommended, and whether that person even has good taste.
2. **The loop never closes.** Someone gives you a reco, you either do it or you don't, but they never know. There's no acknowledgement, no reaction, no consequence.
3. **Context is lost.** "Stacey said go here" means nothing if you don't know Stacey's taste.

RECO fixes all three: it socialises the recommendation, preserves the context (why, from whom, with what enthusiasm), and closes the loop when you actually do it.

### The feeling

Fun. Surprisingly human. A little bit funny. The sin bin and "stinkers" sound punishing but they're light-hearted — they make the app more useful because people start to understand that not all tastes are the same.

Every interaction should have **cause and effect**: giving a reco feels like putting your reputation on the line. Doing it and loving it feels like vindication. Hating everything might mean you're a Negative Nancy. These consequences are what make it feel alive rather than like another list app.

The app should also **stimulate conversation**. When you finish an incredible film or meal, the instinct is to talk about it — but your friends haven't seen it yet. RECO creates the conditions for that conversation between the right people.

### The philosophy

- **Dunbar's Number is real.** The tier system (Close / Clan / Tribe, max 150 friends total) isn't a limitation, it's the product. You can only really know the taste of ~150 people. More than that and the signal disappears.
- **1-in-1-out thinking.** Quality over quantity. Fewer recos, better recos, actually done.
- **Personalisation is human, not algorithmic.** You should think about who you're sending a reco to and why it's right *for them*. The app should nudge that thinking, never replace it.
- **Humour is load-bearing.** Stinkers, sin bins, pleas for release — the language is intentional. When writing UI copy, error states, empty states, labels: design smiles into the language. Dry, corporate, or generic copy is a bug.

### What RECO is NOT

- **Not an algorithm.** Never "you might also like." Someone who loves Michelin dining and natural wine doesn't necessarily want your KFC rec. Taste is personal and contextual.
- **Not a follower/celebrity model.** Dua Lipa already has Service95. If you want her recos, they're online. RECO is for people in your actual life whose taste you know and trust — or are learning to.
- **Not about volume.** Not about receiving hundreds of recos. About actually doing them, actually talking about them.
- **Not a discovery engine.** It's a trust layer on top of people you already know.

### The target user

- People who have spent too much time re-writing the same reco for different friends.
- People whose Google Maps is a masterpiece — but who don't always want to share the whole thing.
- People who post on Instagram asking for reco's when going somewhere new.
- People who go on Reddit to discuss a film because none of their friends have watched it yet.
- People who have a notes app full of recos with zero context about where they came from.

---

## Upcoming features (build foundations that support these)

### Conversations + voice
- **Conversations** — replying to a reco, debating it, getting someone to convince you why you should give it another shot. Next major feature. `messages` table already exists (reco_id, sender_id, recipient_id, body, audio_url).
- **Voice notes** — sending a voice note as a "why" on a reco (why_audio_url already on recommendations) or in conversation replies (audio_url on messages). Infrastructure exists; UI not built.
- **Voice-to-text transcription** — toggle between listening to a voice note and reading the transcript. User preference should persist. Build so both modes are available simultaneously, not either/or.

### Maps + location
- **Google Maps / Places API** — two uses: (1) auto-fill restaurant details (name, address, website, Instagram, hero image) from a search; (2) map view to browse recos geographically. When building restaurant fields, expect Google Places to be the primary input method, not manual typing.
- **Location-based browsing** — selecting a city or region (e.g. "Seville, Spain") and browsing recos from friends in that area. Important for travel use case — someone going to Spain asks for recos, the map view shows them spatially.

### Sharing + social
- **Shareable bucket lists** — curated lists of recos that can be shared as a link or sent to specific people. `lists`, `list_items`, `list_shares` tables already exist in the schema. Published lists are sharable; draft lists are private.
- **Forwarding a reco** — sending someone else's reco on to another person, with credit to the original sender. The original sender gets notified as a "reco legend" (or similar badge language). Important: the forward should preserve the original why_text and sender attribution, not erase it.

### Profile + stats
- **Clickable profile stats** — tapping your sent/received counts on the profile page opens a view of those recos. Build profile stats as navigable, not just decorative numbers.
- **Editing a past reco score** — being able to revise a rating after the fact. Could be because you gave it another chance, or your opinion changed. The edit should re-trigger any relevant notifications to the sender.

### UI / polish
- **Typography and readability pass** — all text should be legible at a glance. Contrast, line-height, and font size should follow WCAG AA minimums as a floor. Muted text must still be readable, not decorative.
- **Auto-height text areas** — every textarea in the app should grow with its content rather than scroll internally. No fixed-height text inputs.
- **CTAs and form fields follow best practice** — tap targets minimum 44×44pt, labels above fields (not placeholder-only), clear active/focus states, disabled states that explain why.
- **Animations** — the experience should feel alive. Sheet open/close, card transitions, success states, loading — all should have considered motion. Favour spring physics over linear easing. Never animate for its own sake; every animation should reinforce what just happened.

### Personas + badges
- **Taste personas and badges** — based on usage patterns. Stinkers is the start. Consistent great recos = recognition. Never doing any recos = gentle call-out. Giving recos to someone who hates everything you send = a badge for trying. Language and humour must lead — these should make people smile, not feel judged.

### Email notifications
- **Transactional emails** — critical for a webapp without push notifications. Users need to know when they've received a reco, when someone rates one of theirs, when a friend request comes in, when they're sin-binned. Without this, the loop only closes if both users are actively opening the app.
- **Priority order when building:** reco received → feedback received → friend request → sin bin triggered → sin bin plea. These map directly to the existing `notif_type` enum.
- **Do not build until:** core bugs are resolved and the main feature set is stable. Email is a multiplier on whatever the app already does — if the experience has rough edges, email drives people back to those rough edges.
- **Likely implementation:** Supabase has a built-in email hook via pg_net / database webhooks, or use a third-party like Resend (recommended — simple API, good deliverability, React Email for templates). Supabase Edge Functions are the right trigger layer.
- **Tone matters:** email copy must match the app's voice. "You've got a new recommendation" is wrong. Something closer to the personality of the in-app language.

### Import + sharing
- **WhatsApp paste-to-reco** — paste a raw WhatsApp message (e.g. "omg you have to go to Lina Stores, the pasta is insane, it's in Soho") and the app parses it into a structured reco automatically. User only needs to confirm the details and tag who sent it. The sender doesn't need to be on RECO — they should be taggable by name only (non-user attribution). This is the killer onboarding flow: gets recos out of WhatsApp and into RECO in seconds. Likely needs an LLM parsing step (title, category, location, why_text extracted from free text).
- **Shareable reco profile** — a public-facing profile page showing your reco'd items (or a curated subset). Shareable as a link. Controls over what's visible (all recos / by category / only done ones etc).
- **QR code + share link to receive recos** — a personal link/QR that anyone can tap to send you a reco, even if they're not on RECO. The `/send/qr` route already exists. When built as a native app, RECO should appear as a share target in the iOS/Android share sheet — so "Share" from Google Maps surfaces RECO alongside WhatsApp and Instagram. This is a native app concern but the web URL scheme should be designed to support it (deep links into the send flow pre-populated with the shared content).

---

## Feature design checklist

Before building any new feature, ask:
1. **Does it close a loop or open a conversation?** If it does neither, it probably doesn't belong.
2. **Does the copy have personality?** Generic labels are a red flag. Find the funny or the human angle.
3. **Does it respect the trust graph?** Features should reinforce that recos mean something because they come from someone specific whose taste you know.
4. **Is it easy enough to feel like magic?** Auto-fill from a Spotify link, auto-fetch artwork, one tap to send — friction is the enemy.
5. **Does it add to the volume problem or reduce it?** If it makes it easier to spam recos, it's wrong. If it makes each reco feel more considered, it's right.

---

## Project overview

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Realtime + Storage)
**Root:** `/Users/macbook/Desktop/RECO/app/`
**Deploy:** `git push` to Vercel — never use the Vercel CLI (permission issues)

---

## Directory structure

```
src/
  app/
    (auth)/           login, onboarding, setup-profile
    (app)/            all authenticated pages (layout.tsx has TabBar)
      home/           main feed — To do / Done / No gos tabs
      send/           give a reco to a friend
      notifications/  all notification types
      sinbin/         manage your sin bin + bins you're in
      friends/        friend list, add friends, friend profile
      profile/        own profile + edit
      browse/         explore recos
      get/            request a reco
      lists/          curated lists
    api/
      link-meta/      fetch Open Graph meta for URLs
      spotify-meta/   fetch Spotify artwork + title
      upload-image/   upload to Supabase Storage
  components/
    ui/               RecoCard, BottomSheet, TabBar, StatusBar, etc.
    overlays/         FeedbackSheet, NoGoSheet, BeenThereSheet, GiveRecoSheet, SinBinModal, etc.
  lib/
    data/             recos.ts, friends.ts, notifications.ts, sinbin.ts, picks.ts
    supabase/         client.ts (browser), server.ts (RSC/API)
    context/          RecosContext (manual recos)
  constants/
    categories.ts     CATEGORIES, CATEGORY_MAP, getCategoryLabel/Color/Bg
    tiers.ts          TIERS, SCORE thresholds (BAD_MAX=3, MEH_MAX=6, SIN_BIN_THRESHOLD=3)
  types/
    app.types.ts      Profile, Reco, RecoMeta, Friend, Notification, RecoList, etc.
    database.types.ts Supabase generated types (may be stale — trust schema.sql over this)
```

---

## Database schema

Source of truth: `supabase/schema.sql`. All tables are in `public` schema with RLS enabled.

### Tables

#### `profiles`
| column | type | notes |
|---|---|---|
| id | uuid PK | references auth.users |
| username | text unique | |
| display_name | text | |
| avatar_url | text | nullable |
| joined_at | timestamptz | default now() |
| recos_sent | int | auto-incremented by trigger |

#### `friend_connections`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → profiles | |
| friend_id | uuid → profiles | |
| tier | friend_tier enum | 'band' \| 'close' \| 'clan' \| 'tribe' |
| created_at | timestamptz | |

Unique on (user_id, friend_id). A pending request is a row with one direction; accepted = two rows.

#### `recommendations`
| column | type | notes |
|---|---|---|
| id | uuid PK | generated client-side with crypto.randomUUID() to avoid SELECT after INSERT |
| sender_id | uuid → profiles | |
| category | text | see CategoryId below |
| custom_cat | text | nullable, used when category = 'custom' |
| title | text | |
| why_text | text | nullable |
| why_audio_url | text | nullable |
| meta | jsonb | see RecoMeta below |
| created_at | timestamptz | |

#### `reco_recipients`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| reco_id | uuid → recommendations | |
| recipient_id | uuid → profiles | |
| status | text | check: 'unseen' \| 'seen' \| 'been_there' \| 'done' \| 'no_go' |
| score | int | check: 1–10, nullable |
| feedback_text | text | nullable |
| feedback_audio | text | nullable |
| rated_at | timestamptz | nullable |
| created_at | timestamptz | |

Unique on (reco_id, recipient_id).

**Status flow:** `unseen → seen → done` (rated) or `been_there` (already done it) or `no_go` (won't do it).

**Home feed query** only includes `['unseen', 'seen', 'been_there']` — `done` and `no_go` are excluded so they never reappear in To do.

#### `sin_bin`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| sender_id | uuid → profiles | the person whose recos are bad |
| recipient_id | uuid → profiles | the person tracking them |
| category | text | |
| bad_count | int | |
| is_active | bool | true = currently sin-binned |
| triggered_at | timestamptz | nullable |
| released_at | timestamptz | nullable |

Unique on (sender_id, recipient_id, category).

**Trigger `update_sin_bin`** fires on `reco_recipients` UPDATE. If `status = 'done'` and `score <= 3`, it upserts sin_bin and activates at `bad_count >= 3`.

#### `notifications`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid → profiles | recipient of the notification |
| type | notif_type enum | see below |
| actor_id | uuid → profiles | person who triggered it |
| reco_id | uuid → recommendations | nullable |
| payload | jsonb | all extra data |
| read | bool | default false |
| created_at | timestamptz | |

**notif_type enum values:** `feedback_received` · `reco_received` · `request_received` · `friend_added` · `friend_request` · `friend_accepted` · `sin_bin`

**payload conventions:**
- `feedback_received`: `{ score, feedback_text, reco_title, reco_category, subtype? }`
  - `subtype: 'been_there'` — already done it
  - `subtype: 'no_go'` — won't do it (score = -1 sentinel, not stored in DB)
- `reco_received`: `{ title }`
- `request_received`: `{ category, count, constraints?, details?, subtype? }`
  - `subtype: 'been_there_new_request'` — already has it, wants something new; includes `original_title`
- `sin_bin` (to sender): `{ category, bad_count, offences, last_reco_title }`
- `sin_bin` with `subtype: 'plea'` (to recipient): `{ category, message }`
- `sin_bin` with `subtype: 'released'` (to sender): `{ category }`
- `friend_request`: `{ connection_id }`

#### `messages`
Thread per (reco_id, sender_id, recipient_id).

#### `reco_requests`, `lists`, `list_items`, `list_shares`
See schema.sql for full definitions. Lists are draft/published.

---

## App type system

### CategoryId
`'restaurant' | 'tv' | 'podcast' | 'music' | 'book' | 'film' | 'custom'`

Category colors/labels live in `src/constants/categories.ts`. Use `getCategoryLabel()`, `getCategoryColor()`, `getCategoryBg()`.

### RecoMeta (jsonb stored in `recommendations.meta`)
```ts
{
  // Restaurant
  location?, address?, instagram?, website?, image_url?, occasion?, price?,
  // TV
  streaming_service?, year?, genre?, mood?,
  // Podcast / Music
  spotify_url?, artwork_url?, spotify_title?, artist?, era?,
  // Book
  author?, goodreads_url?, length?,
  // Film
  director?,
  // Podcast
  topic?,
  // Generic
  vibes?, budget?, links?: string[]
}
```

### Score thresholds (`src/constants/tiers.ts → SCORE`)
```ts
BAD_MAX = 3          // score <= 3 → "bad" / stinker
MEH_MAX = 6          // score <= 6 → "meh"
SIN_BIN_THRESHOLD = 3  // 3 bad scores in a category → sin-binned
```
Scores are **1–10** throughout the app and DB. The DB check constraint is `score >= 1 and score <= 10`.

### Friend tiers
`'close'` (≤15, weight 3) · `'clan'` (≤50, weight 2) · `'tribe'` (≤150, weight 1)

---

## Key data layer patterns

All Supabase calls use the **browser client** (`createClient()` from `@/lib/supabase/client`) in client components. Server routes use `@/lib/supabase/server`.

### Reco queries always join through `reco_recipients`

```ts
supabase
  .from('reco_recipients')
  .select(`
    id, status, score, feedback_text, rated_at,
    recommendations (
      id, sender_id, category, custom_cat, title,
      why_text, why_audio_url, meta, created_at,
      profiles (id, display_name, username, avatar_url)
    )
  `)
  .eq('recipient_id', userId)
```

### Data functions (`src/lib/data/recos.ts`)
- `fetchHomeFeed(userId)` — status IN ('unseen', 'seen', 'been_there')
- `fetchDoneRecos(userId)` — status = 'done', ordered by rated_at desc
- `fetchNoGoRecos(userId)` — status = 'no_go', ordered by rated_at desc
- `submitFeedback(...)` — sets status='done', score, feedback_text; handles sin bin logic
- `markBeenThere(recoId, recipientId, senderId, recoTitle)` — status='been_there', notifies sender
- `markNoGo(recoId, recipientId, senderId, reason, recoTitle)` — status='no_go', notifies sender
- `requestNewReco(recipientId, senderId, recoTitle, category)` — notification only
- `sendReco(...)` — inserts into recommendations + reco_recipients + notifications

---

## UI conventions

- **Dark theme throughout.** Background `#0a0a0c`, cards `#111114`, elevated `#18181c`.
- **Accent colour** is yellow-green (`#D4E23A`). Bad = red (`#F56E6E`). Meh = amber. Good = green.
- **Bottom sheets** use `BottomSheet` component — always `onPointerDown` for close triggers inside `overflow-y-auto`, not `onClick` (iOS Safari issue).
- **RecoCard** has dormant (image card) and expanded (full sheet) states. Tap anywhere outside interactive elements to close expanded state.
- **Optimistic updates** — UI updates immediately on user action; DB call happens async. Home feed uses `doneIds: Set<string>` to optimistically hide rated/no-go'd recos. No-go tab uses `noGoRecos` state for optimistic adds, `dbNoGoRecos` (loaded lazily on first tab open) for persisted ones.
- **Card grouping** — recos with the same title+category from different senders are merged into one card with multiple `recommenders`.
- Tailwind JIT is in use — class strings must be **static** (no dynamic string construction for full class names). Use lookup maps like `CAT_PILL` for category-specific classes.

---

## RLS summary

- `profiles`: all authenticated users can SELECT; owner can UPDATE
- `recommendations`: sender can SELECT/INSERT; recipient can SELECT (via reco_recipients join)
- `reco_recipients`: recipient can SELECT/UPDATE; sender can SELECT/INSERT
- `notifications`: user can SELECT/UPDATE own rows; INSERT is unrestricted (any authenticated user can notify any other)
- `sin_bin`: recipient (tracker) can SELECT/UPDATE; INSERT via trigger (security definer)
- `friend_connections`: both parties can SELECT; user_id can manage (INSERT/UPDATE/DELETE)

---

## Triggers

| trigger | table | fires on | function |
|---|---|---|---|
| `on_auth_user_created` | auth.users | INSERT | `handle_new_user` — creates profile row |
| `on_reco_recipient_created` | reco_recipients | INSERT | `increment_recos_sent` — bumps profiles.recos_sent |
| `on_reco_rated` | reco_recipients | UPDATE | `update_sin_bin` — upserts sin_bin when score ≤ 3 |

The `update_sin_bin` trigger runs as `security definer` and handles sin bin creation/activation. The app code also writes sin_bin rows directly as a belt-and-suspenders fallback.

---

## Common gotchas

1. **`reco_recipients.status` check constraint** — only accepts `'unseen' | 'seen' | 'been_there' | 'done' | 'no_go'`. Any other value is rejected at DB level with a check constraint violation.

2. **Supabase generated types (`database.types.ts`) may be stale.** Trust `schema.sql` and the hand-written types in `app.types.ts` over generated types.

3. **`recommendations.id` is generated client-side** using `crypto.randomUUID()` before the INSERT, so we can reference it in `reco_recipients` without a round-trip.

4. **No-go recos must not appear in home feed.** `fetchHomeFeed` excludes `no_go` from its status filter. If you ever add a new status, check whether it should be in that filter.

5. **iOS Safari tap-to-close inside scroll containers** — `onClick` is unreliable. Use `onPointerDown`/`onPointerUp` with a movement threshold (< 8px = tap). All interactive elements inside the card must `e.stopPropagation()` on `onPointerDown`.

6. **Tailwind `flex flex-col` on feed containers causes children to shrink** when many items are present. Use block layout with `mb-3` on each card wrapper instead.

7. **Sin bin score threshold is 1–10 scale** — `score <= 3` is "bad". The DB trigger uses `<= 3`. The app constant is `SCORE.BAD_MAX = 3`.
